import type { CorrelationContext, DiningSession, SessionAccessView } from "@taps/contracts";
import type { ProviderRegistry } from "@taps/mcp";
import { requireProvider } from "@taps/mcp";
import { canTransitionSession } from "@taps/domain";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { newId } from "../../lib/idempotency";
import type { DomainEventBus } from "../events/domain-event-bus";
import type { JobDispatcher } from "../jobs/job-dispatcher";
import type { AuditRepository, SessionRepository } from "../repositories";
import { PosIntegrationAgent } from "../pos/pos-integration-agent";

export class TableSessionAgent {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly audit: AuditRepository,
    private readonly events: DomainEventBus,
    private readonly providers: ProviderRegistry,
    private readonly posAgent: PosIntegrationAgent,
    private readonly jobs: JobDispatcher
  ) {}

  async createSession(
    tagCode: string,
    posProviderKey: string,
    context: CorrelationContext,
    options: { publicGraceMinutes: number; supportRetentionDays: number }
  ): Promise<DiningSession> {
    const nfcProvider = requireProvider(this.providers.nfc, "default", "NFC");
    const tagResolution = await nfcProvider.resolveTag.execute({
      provider: "default",
      action: "resolve_tag",
      version: "1",
      timeoutMs: 3000,
      context,
      input: { tagCode }
    });

    if (!tagResolution.ok || !tagResolution.output) {
      throw new NotFoundError(tagResolution.errorMessage ?? "NFC tag not found", tagResolution.errorCode);
    }

    const { restaurantId, tableId, nfcTagId } = tagResolution.output;
    const existing = await this.sessions.findActiveByTable(restaurantId, tableId);

    if (existing && ["active", "payment_in_progress", "partially_paid", "fully_paid"].includes(existing.status)) {
      return existing;
    }

    await this.posAgent.fetchTableStatus(posProviderKey, { ...context, restaurantId }, tableId);
    const now = new Date();
    const session: DiningSession = {
      id: newId("sess"),
      restaurantId,
      tableId,
      nfcTagId,
      publicToken: newId("public"),
      status: "active",
      openedAt: now.toISOString(),
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const saved = await this.sessions.save(session);
    await this.audit.record({
      id: newId("audit"),
      restaurantId,
      sessionId: saved.id,
      actorType: context.actor.type,
      actorId: context.actor.id,
      action: "session.created",
      subjectType: "dining_session",
      subjectId: saved.id,
      correlationId: context.correlationId,
      createdAt: now.toISOString()
    });

    await this.events.publish({
      id: newId("evt"),
      type: "session.created",
      aggregateType: "dining_session",
      aggregateId: saved.id,
      occurredAt: now.toISOString(),
      context: { ...context, restaurantId },
      payload: {
        tableId,
        nfcTagId
      }
    });

    return saved;
  }

  async validatePublicAccess(publicToken: string): Promise<SessionAccessView> {
    const session = await this.sessions.findByPublicToken(publicToken);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    const now = Date.now();
    const publicAccessAllowed =
      session.status !== "archived" &&
      session.status !== "public_expired" &&
      session.status !== "cleared_locked" &&
      (!session.closedAt || !session.publicExpiresAt || now < Date.parse(session.publicExpiresAt));

    const supportAccessAllowed =
      session.status !== "archived" &&
      (!session.closedAt || !session.auditExpiresAt || now < Date.parse(session.auditExpiresAt));

    return {
      session,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      publicAccessAllowed,
      supportAccessAllowed,
      reason: publicAccessAllowed ? undefined : this.reasonForDeniedAccess(session)
    };
  }

  async expireSession(sessionId: string): Promise<DiningSession> {
    return this.expirePublicAccess(sessionId);
  }

  async closeSession(
    sessionId: string,
    options: { publicGraceMinutes: number; supportRetentionDays: number },
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<DiningSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (session.status === "closed") {
      return session;
    }

    if (session.status !== "fully_paid") {
      throw new ConflictError(`Session ${sessionId} cannot be closed from ${session.status}`);
    }

    const now = new Date();
    const saved = await this.sessions.save({
      ...session,
      status: "closed",
      closedAt: now.toISOString(),
      publicExpiresAt: new Date(now.getTime() + options.publicGraceMinutes * 60 * 1000).toISOString(),
      auditExpiresAt: new Date(now.getTime() + options.supportRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      version: session.version + 1
    });

    await this.jobs.enqueue({
      name: "session.expire_public_access",
      payload: { sessionId: saved.id },
      dedupeKey: `session_expire:${saved.id}`,
      availableAt: saved.publicExpiresAt
    });
    await this.jobs.enqueue({
      name: "session.archive",
      payload: { sessionId: saved.id },
      dedupeKey: `session_archive:${saved.id}`,
      availableAt: saved.auditExpiresAt
    });
    await this.recordLifecycleMutation(saved, "session.closed", mutationContext);
    return saved;
  }

  async expirePublicAccess(
    sessionId: string,
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<DiningSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (session.status === "public_expired") {
      return session;
    }

    if (!canTransitionSession(session.status, "public_expired") && session.status !== "closed") {
      throw new ConflictError(`Session ${sessionId} cannot expire public access from ${session.status}`);
    }

    const saved = await this.sessions.save({
      ...session,
      status: "public_expired",
      closedAt: session.closedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: session.version + 1
    });

    await this.recordLifecycleMutation(saved, "session.public_expired", mutationContext);
    return saved;
  }

  async markTableCleared(
    sessionId: string,
    options: { supportRetentionDays: number },
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<DiningSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (session.status === "archived") {
      throw new ConflictError(`Session ${sessionId} is already archived`);
    }

    const now = new Date();
    const saved = await this.sessions.save({
      ...session,
      status: "cleared_locked",
      closedAt: session.closedAt ?? now.toISOString(),
      publicExpiresAt: now.toISOString(),
      auditExpiresAt:
        session.auditExpiresAt ?? new Date(now.getTime() + options.supportRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      version: session.version + 1
    });

    await this.jobs.enqueue({
      name: "session.archive",
      payload: { sessionId: saved.id },
      dedupeKey: `session_archive:${saved.id}`,
      availableAt: saved.auditExpiresAt
    });
    await this.recordLifecycleMutation(saved, "session.cleared_locked", mutationContext);
    return saved;
  }

  async archiveSession(
    sessionId: string,
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<DiningSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (session.status === "archived") {
      return session;
    }

    if (!["public_expired", "cleared_locked", "transferred"].includes(session.status)) {
      throw new ConflictError(`Session ${sessionId} cannot be archived from ${session.status}`);
    }

    const saved = await this.sessions.save({
      ...session,
      status: "archived",
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: session.version + 1
    });

    await this.recordLifecycleMutation(saved, "session.archived", mutationContext);
    return saved;
  }

  async syncSettlementState(
    sessionId: string,
    input: {
      amountPaidCents: number;
      remainingBalanceCents: number;
      hasPendingPayments: boolean;
    },
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<DiningSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (["closed", "cleared_locked", "public_expired", "archived"].includes(session.status)) {
      return session;
    }

    const nextStatus =
      input.hasPendingPayments
        ? "payment_in_progress"
        : input.remainingBalanceCents === 0 && input.amountPaidCents > 0
          ? "fully_paid"
          : input.amountPaidCents > 0
            ? "partially_paid"
            : "active";

    if (session.status === nextStatus) {
      return session;
    }

    const saved = await this.sessions.save({
      ...session,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      version: session.version + 1
    });

    await this.recordLifecycleMutation(saved, "session.payment_state_synced", mutationContext);
    return saved;
  }

  private reasonForDeniedAccess(session: DiningSession): SessionAccessView["reason"] {
    if (session.status === "archived") {
      return "archived";
    }

    if (session.status === "public_expired") {
      return "expired";
    }

    if (session.status === "cleared_locked") {
      return "cleared";
    }

    if (session.closedAt && session.publicExpiresAt && Date.now() >= Date.parse(session.publicExpiresAt)) {
      return "expired";
    }

    if (session.closedAt) {
      return "closed";
    }

    return "token_mismatch";
  }

  private async recordLifecycleMutation(
    session: DiningSession,
    action:
      | "session.closed"
      | "session.public_expired"
      | "session.archived"
      | "session.payment_state_synced"
      | "session.cleared_locked",
    mutationContext?: { actorType?: CorrelationContext["actor"]["type"]; actorId?: string; correlationId?: string }
  ): Promise<void> {
    const actorType = mutationContext?.actorType ?? "system";
    const actorId = mutationContext?.actorId ?? "session_agent";
    const correlationId = mutationContext?.correlationId ?? newId("corr");

    await this.audit.record({
      id: newId("audit"),
      restaurantId: session.restaurantId,
      sessionId: session.id,
      actorType,
      actorId,
      action,
      subjectType: "dining_session",
      subjectId: session.id,
      correlationId,
      payload: {
        status: session.status,
        closedAt: session.closedAt,
        publicExpiresAt: session.publicExpiresAt,
        auditExpiresAt: session.auditExpiresAt,
        archivedAt: session.archivedAt
      },
      createdAt: new Date().toISOString()
    });

    await this.events.publish({
      id: newId("evt"),
      type: action,
      aggregateType: "dining_session",
      aggregateId: session.id,
      occurredAt: new Date().toISOString(),
      context: {
        correlationId,
        restaurantId: session.restaurantId,
        actor: {
          type: actorType,
          id: actorId
        }
      },
      payload: {
        sessionId: session.id,
        status: session.status
      }
    });
  }
}
