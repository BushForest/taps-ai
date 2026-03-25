import type {
  AdminExceptionSummary,
  AdminRestaurantOverviewResponse,
  AdminSessionDetailResponse,
  AdminSessionSummary,
  CheckSnapshot,
  CloseValidationResult,
  CorrelationContext,
  DiningSession,
  GuestSettlementSummary,
  PosAdminMutation
} from "@taps/contracts";
import { isPendingPaymentStatus } from "@taps/domain";
import { NotFoundError } from "../../lib/errors";
import { newId } from "../../lib/idempotency";
import type {
  AllocationPlanRepository,
  AuditRepository,
  CheckRepository,
  PaymentAttemptRepository,
  PayerRepository,
  ReconciliationExceptionRepository,
  SessionRepository
} from "../repositories";
import { CheckAgent } from "../checks/check-agent";
import { PosIntegrationAgent } from "../pos/pos-integration-agent";
import { TableSessionAgent } from "../sessions/session-agent";
import { SplitPaymentAgent } from "../splits/split-payment-agent";

export class AdminAgent {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly exceptions: ReconciliationExceptionRepository,
    private readonly audit: AuditRepository,
    private readonly sessionAgent: TableSessionAgent,
    private readonly checks: CheckRepository,
    private readonly plans: AllocationPlanRepository,
    private readonly payers: PayerRepository,
    private readonly payments: PaymentAttemptRepository,
    private readonly splitAgent: SplitPaymentAgent,
    private readonly checkAgent: CheckAgent,
    private readonly posAgent: PosIntegrationAgent,
    private readonly policies: {
      supportRetentionDays: number;
    }
  ) {}

  async viewSessionHistory(restaurantId: string): Promise<AdminSessionSummary[]> {
    const sessions = await this.sessions.listByRestaurant(restaurantId);
    return Promise.all(sessions.map((session) => this.buildSessionSummary(session)));
  }

  async getRestaurantOverview(restaurantId: string): Promise<AdminRestaurantOverviewResponse> {
    const sessions = await this.viewSessionHistory(restaurantId);
    const exceptions = await this.listOpenExceptions(restaurantId);
    const tables = new Map<string, AdminRestaurantOverviewResponse["tables"][number]>();

    for (const summary of sessions) {
      const current = tables.get(summary.session.tableId);
      if (current && Date.parse(current.updatedAt ?? summary.session.updatedAt) >= Date.parse(summary.session.updatedAt)) {
        continue;
      }

      tables.set(summary.session.tableId, {
        tableId: summary.session.tableId,
        tableLabel: this.toTableLabel(summary.session.tableId),
        sessionId: summary.session.id,
        sessionStatus: summary.session.status,
        publicAccessAllowed: summary.access.publicAccessAllowed,
        supportAccessAllowed: summary.access.supportAccessAllowed,
        remainingBalanceCents: summary.remainingBalanceCents,
        openExceptionCount: summary.openExceptionCount,
        payerCompletionCount: summary.payerCompletionCount,
        totalPayerCount: summary.totalPayerCount,
        updatedAt: summary.latestCheckUpdatedAt ?? summary.session.updatedAt
      });
    }

    return {
      restaurantId,
      tableCount: tables.size,
      activeSessionCount: sessions.filter((summary) =>
        ["active", "payment_in_progress", "partially_paid", "fully_paid"].includes(summary.session.status)
      ).length,
      blockedSessionCount: sessions.filter((summary) => summary.hasBlockingMismatch || summary.hasPendingPayments).length,
      openExceptionCount: exceptions.length,
      tables: [...tables.values()].sort((left, right) => left.tableLabel.localeCompare(right.tableLabel)),
      sessions,
      exceptions
    };
  }

  async getSessionDetail(sessionId: string): Promise<AdminSessionDetailResponse> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const access = await this.sessionAgent.validatePublicAccess(session.publicToken);
    const latestPlan = await this.plans.findLatestBySession(session.id);
    const latestCheck = await this.checks.findLatestBySession(session.id);
    const payers = await this.payers.listBySession(session.id);
    const paymentAttempts = await this.payments.listBySession(session.id);
    const exceptions = await this.exceptions.listOpenBySession(session.id);
    const pendingPayments = paymentAttempts.filter((payment) => isPendingPaymentStatus(payment.status));

    const normalizedCheck = latestCheck ? this.checkAgent.buildGuestCheckSnapshot(latestCheck, latestPlan) : undefined;
    const closeValidation = normalizedCheck
      ? latestPlan
        ? this.splitAgent.enforceCloseRules({
            check: normalizedCheck,
            plan: latestPlan,
            hasPendingPayments: pendingPayments.length > 0,
            hasBlockingMismatch: exceptions.length > 0
          })
        : this.fallbackCloseValidation(normalizedCheck)
      : undefined;

    return {
      session,
      access,
      check: normalizedCheck,
      payers,
      paymentAttempts,
      exceptions,
      closeValidation,
      settlement: normalizedCheck
        ? this.buildSettlementSummary(normalizedCheck, payers, closeValidation, pendingPayments.length > 0, exceptions.length > 0, session)
        : undefined,
      latestAllocationPlanId: latestPlan?.id
    };
  }

  async listOpenExceptions(restaurantId: string): Promise<AdminExceptionSummary[]> {
    const sessions = await this.sessions.listByRestaurant(restaurantId);
    const records = new Map<string, AdminExceptionSummary>();

    for (const session of sessions) {
      const exceptions = await this.exceptions.listOpenBySession(session.id);
      for (const exception of exceptions) {
        records.set(exception.id, exception);
      }
    }

    return [...records.values()].sort((left, right) => Date.parse(right.detectedAt) - Date.parse(left.detectedAt));
  }

  async resolveSyncException(exceptionId: string): Promise<void> {
    await this.exceptions.resolve(exceptionId, new Date().toISOString());
  }

  async markTableCleared(
    sessionId: string,
    actor: { type: CorrelationContext["actor"]["type"]; id: string },
    correlationId?: string
  ): Promise<void> {
    const session = await this.sessionAgent.markTableCleared(sessionId, {
      supportRetentionDays: this.policies.supportRetentionDays
    }, {
      actorType: actor.type,
      actorId: actor.id,
      correlationId
    });
    await this.audit.record({
      id: newId("audit"),
      restaurantId: session.restaurantId,
      sessionId: session.id,
      actorType: actor.type,
      actorId: actor.id,
      action: "table.cleared",
      subjectType: "dining_session",
      subjectId: session.id,
      correlationId,
      createdAt: new Date().toISOString()
    });
  }

  async mutateSessionCheck(input: {
    sessionId: string;
    posProviderKey: string;
    mutation: PosAdminMutation;
    actor: { type: CorrelationContext["actor"]["type"]; id: string };
    correlationId?: string;
  }): Promise<AdminSessionDetailResponse> {
    const session = await this.sessions.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${input.sessionId} not found`);
    }

    const latestCheck = await this.checks.findLatestBySession(session.id);
    const mutation = input.mutation;
    const providerMutation =
      mutation.type === "void_line_item" && latestCheck
        ? {
            ...mutation,
            lineItemId:
              latestCheck.lines.find((line) => line.id === mutation.lineItemId)?.posLineId ??
              mutation.lineItemId
          }
        : mutation;
    await this.posAgent.adminMutateCheck(
      input.posProviderKey,
      {
        correlationId: input.correlationId ?? newId("corr"),
        restaurantId: session.restaurantId,
        actor: {
          type: input.actor.type,
          id: input.actor.id
        }
      },
      {
        tableId: session.tableId,
        sessionId: session.id,
        posCheckId: latestCheck?.posCheckId,
        mutation: providerMutation
      }
    );

    const refreshed = (await this.checkAgent.refreshCheckSnapshot(
      input.posProviderKey,
      {
        correlationId: input.correlationId ?? newId("corr"),
        restaurantId: session.restaurantId,
        actor: {
          type: input.actor.type,
          id: input.actor.id
        }
      },
      session
    )).snapshot;

    const pendingPayments = await this.payments.listPendingBySession(session.id);
    await this.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: refreshed.amountPaidCents,
      remainingBalanceCents: refreshed.remainingBalanceCents,
      hasPendingPayments: pendingPayments.length > 0
    }, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      correlationId: input.correlationId
    });

    await this.audit.record({
      id: newId("audit"),
      restaurantId: session.restaurantId,
      sessionId: session.id,
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: `admin.check_mutation.${input.mutation.type}`,
      subjectType: "check_snapshot",
      subjectId: refreshed.id,
      correlationId: input.correlationId,
      payload: {
        mutation: providerMutation
      },
      createdAt: new Date().toISOString()
    });

    return this.getSessionDetail(session.id);
  }

  private async buildSessionSummary(session: DiningSession): Promise<AdminSessionSummary> {
    const access = await this.sessionAgent.validatePublicAccess(session.publicToken);
    const latestPlan = await this.plans.findLatestBySession(session.id);
    const latestCheck = await this.checks.findLatestBySession(session.id);
    const payers = await this.payers.listBySession(session.id);
    const paymentAttempts = await this.payments.listBySession(session.id);
    const exceptions = await this.exceptions.listOpenBySession(session.id);
    const pendingPayments = paymentAttempts.filter((payment) => isPendingPaymentStatus(payment.status));
    const normalizedCheck = latestCheck ? this.checkAgent.buildGuestCheckSnapshot(latestCheck, latestPlan) : undefined;
    const closeValidation = normalizedCheck
      ? latestPlan
        ? this.splitAgent.enforceCloseRules({
            check: normalizedCheck,
            plan: latestPlan,
            hasPendingPayments: pendingPayments.length > 0,
            hasBlockingMismatch: exceptions.length > 0
          })
        : this.fallbackCloseValidation(normalizedCheck)
      : undefined;

    return {
      session,
      access,
      remainingBalanceCents: normalizedCheck?.remainingBalanceCents ?? 0,
      assignmentCompleteness: normalizedCheck?.assignmentSummary.completeness ?? "fully_assigned",
      hasPendingPayments: pendingPayments.length > 0,
      hasBlockingMismatch: exceptions.length > 0,
      payerCompletionCount: payers.filter((payer) => payer.status === "completed").length,
      totalPayerCount: payers.length,
      checkVersion: normalizedCheck?.version,
      latestCheckUpdatedAt: normalizedCheck?.updatedAt,
      openExceptionCount: exceptions.length,
      closeValidation
    };
  }

  private buildSettlementSummary(
    check: CheckSnapshot,
    payers: Awaited<ReturnType<PayerRepository["listBySession"]>>,
    closeValidation: CloseValidationResult | undefined,
    hasPendingPayments: boolean,
    hasBlockingMismatch: boolean,
    session: DiningSession
  ): GuestSettlementSummary {
    return {
      tableComplete: session.status === "closed",
      tableCloseable: closeValidation?.canClose ?? false,
      remainingBalanceCents: check.remainingBalanceCents,
      assignmentCompleteness: check.assignmentSummary.completeness,
      hasPendingPayments,
      hasBlockingMismatch,
      checkVersion: check.version,
      lastUpdatedAt: check.updatedAt,
      unassignedLineItemIds: check.assignmentSummary.unassignedLineItemIds,
      unassignedTinyItemIds: check.assignmentSummary.unassignedTinyItemIds,
      payerCompletionCount: payers.filter((payer) => payer.status === "completed").length,
      totalPayerCount: payers.length
    };
  }

  private fallbackCloseValidation(check: CheckSnapshot): CloseValidationResult {
    return {
      canClose: check.remainingBalanceCents <= 1 && check.assignmentSummary.unassignedLineItemIds.length === 0,
      reasons: [
        ...(check.remainingBalanceCents <= 1 ? [] : ["Remaining balance exceeds tolerance"]),
        ...(check.assignmentSummary.unassignedLineItemIds.length === 0 ? [] : ["Unassigned payable items remain"])
      ],
      unassignedLineItemIds: check.assignmentSummary.unassignedLineItemIds,
      remainingBalanceCents: check.remainingBalanceCents,
      toleranceExceededByCents: Math.max(check.remainingBalanceCents - 1, 0)
    };
  }

  private toTableLabel(tableId: string): string {
    if (tableId.startsWith("table_")) {
      return `Table ${tableId.slice("table_".length)}`;
    }

    return tableId;
  }
}
