import type { AllocationPlan, CheckChangeSet, CheckLineItem, CheckSnapshot, CorrelationContext, DiningSession } from "@taps/contracts";
import { canTransitionCheck } from "@taps/domain";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { newId } from "../../lib/idempotency";
import type { DomainEventBus } from "../events/domain-event-bus";
import type { AuditRepository, CheckRepository } from "../repositories";
import { PosIntegrationAgent } from "../pos/pos-integration-agent";
import { normalizeCheckSnapshot } from "./check-normalizer";

export class CheckAgent {
  constructor(
    private readonly checks: CheckRepository,
    private readonly audit: AuditRepository,
    private readonly events: DomainEventBus,
    private readonly posAgent: PosIntegrationAgent
  ) {}

  async fetchOrCreateOpenCheck(
    posProviderKey: string,
    context: CorrelationContext,
    session: DiningSession,
    allowCreate: boolean
  ): Promise<CheckSnapshot> {
    const current = await this.posAgent.fetchCheck(posProviderKey, context, session.tableId, session.id);
    if (current) {
      return this.persistIfChanged(session.id, current, context);
    }

    if (!allowCreate) {
      throw new NotFoundError(`No open check found for session ${session.id}`);
    }

    await this.posAgent.createOrder(posProviderKey, context, session.tableId, session.id);
    const createdCheck = await this.posAgent.fetchCheck(posProviderKey, context, session.tableId, session.id);

    if (!createdCheck) {
      throw new ConflictError("POS order creation returned no retrievable check");
    }

    return this.persistIfChanged(session.id, createdCheck, context);
  }

  async refreshCheckSnapshot(
    posProviderKey: string,
    context: CorrelationContext,
    session: DiningSession
  ): Promise<{ snapshot: CheckSnapshot; changes?: CheckChangeSet }> {
    const latest = await this.checks.findLatestBySession(session.id);
    const current = await this.posAgent.fetchCheck(posProviderKey, context, session.tableId, session.id);

    if (!current) {
      if (latest && canTransitionCheck(latest.status, "closed")) {
        const closed = await this.checks.save(
          this.buildPersistedSnapshot(
            session.id,
            {
              ...latest,
              status: "closed",
              closedAt: new Date().toISOString()
            },
            latest.version + 1,
            latest
          )
        );
        return { snapshot: normalizeCheckSnapshot(closed) };
      }

      throw new NotFoundError(`No check found for session ${session.id}`);
    }

    const snapshot = await this.persistIfChanged(session.id, current, context);
    const changes = latest ? this.detectCheckChanges(latest, snapshot) : undefined;
    return { snapshot: normalizeCheckSnapshot(snapshot), changes };
  }

  buildGuestCheckSnapshot(snapshot: CheckSnapshot, allocationPlan?: AllocationPlan | null): CheckSnapshot {
    return normalizeCheckSnapshot(snapshot, allocationPlan);
  }

  detectCheckChanges(previous: CheckSnapshot, next: CheckSnapshot): CheckChangeSet | undefined {
    const previousLines = new Map(previous.lines.map((line) => [line.posLineId, line]));
    const nextLines = new Map(next.lines.map((line) => [line.posLineId, line]));
    const addedLineIds: string[] = [];
    const removedLineIds: string[] = [];
    const changedLineIds: string[] = [];

    for (const [posLineId, nextLine] of nextLines.entries()) {
      const prior = previousLines.get(posLineId);
      if (!prior) {
        addedLineIds.push(nextLine.id);
        continue;
      }

      if (this.lineChanged(prior, nextLine)) {
        changedLineIds.push(nextLine.id);
      }
    }

    for (const [posLineId, previousLine] of previousLines.entries()) {
      if (!nextLines.has(posLineId)) {
        removedLineIds.push(previousLine.id);
      }
    }

    const totalsChanged =
      previous.totalCents !== next.totalCents ||
      previous.amountPaidCents !== next.amountPaidCents ||
      previous.remainingBalanceCents !== next.remainingBalanceCents ||
      previous.taxCents !== next.taxCents ||
      previous.sourceCheckVersion !== next.sourceCheckVersion;

    if (!addedLineIds.length && !removedLineIds.length && !changedLineIds.length && !totalsChanged) {
      return undefined;
    }

    return {
      checkId: next.id,
      previousVersion: previous.version,
      nextVersion: next.version,
      addedLineIds,
      removedLineIds,
      changedLineIds,
      totalsChanged
    };
  }

  private async persistIfChanged(
    sessionId: string,
    snapshot: CheckSnapshot,
    context: CorrelationContext
  ): Promise<CheckSnapshot> {
    const latest = await this.checks.findLatestBySession(sessionId);
    if (!latest) {
      const initialSnapshot = this.buildPersistedSnapshot(sessionId, snapshot, 1);

      return this.checks.save(initialSnapshot);
    }

    const changed = this.detectCheckChanges(latest, snapshot);

    if (!changed) {
      return latest;
    }

    const nextSnapshot = this.buildPersistedSnapshot(
      sessionId,
      {
        ...snapshot,
        status: snapshot.status === "closed" ? "closed" : "updated"
      },
      latest.version + 1,
      latest
    );

    const saved = normalizeCheckSnapshot(await this.checks.save(nextSnapshot));
    await this.audit.record({
      id: crypto.randomUUID(),
      restaurantId: context.restaurantId,
      sessionId,
      actorType: "system",
      actorId: "check_agent",
      action: "check.snapshot_refreshed",
      subjectType: "check_snapshot",
      subjectId: saved.id,
      correlationId: context.correlationId,
      payload: changed,
      createdAt: new Date().toISOString()
    });

    await this.events.publish({
      id: crypto.randomUUID(),
      type: "check.changed_detected",
      aggregateType: "check_snapshot",
      aggregateId: saved.id,
      occurredAt: new Date().toISOString(),
      context,
      payload: changed
    });

    return saved;
  }

  private lineChanged(previous: CheckLineItem, next: CheckLineItem): boolean {
    return (
      previous.extendedPriceCents !== next.extendedPriceCents ||
      previous.quantity !== next.quantity ||
      previous.status !== next.status ||
      previous.taxCents !== next.taxCents ||
      previous.feeCents !== next.feeCents
    );
  }

  private buildPersistedSnapshot(
    sessionId: string,
    source: CheckSnapshot,
    version: number,
    previousSnapshot?: CheckSnapshot
  ): CheckSnapshot {
    const nowIso = new Date().toISOString();
    const previousLineIdsByPosLineId = new Map(previousSnapshot?.lines.map((line) => [line.posLineId, line.id]) ?? []);
    const lineIdMap = new Map<string, string>();

    for (const line of source.lines) {
      lineIdMap.set(line.id, previousLineIdsByPosLineId.get(line.posLineId) ?? newId("line"));
    }

    return normalizeCheckSnapshot({
      ...source,
      id: newId("check"),
      sessionId,
      version,
      createdAt: nowIso,
      updatedAt: nowIso,
      lines: source.lines.map((line) => ({
        ...line,
        id: lineIdMap.get(line.id) ?? newId("line"),
        parentLineId: line.parentLineId ? lineIdMap.get(line.parentLineId) : undefined,
        childLineIds: []
      }))
    });
  }
}
