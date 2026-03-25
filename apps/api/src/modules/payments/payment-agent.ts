import type {
  AllocationPlan,
  CheckSnapshot,
  CorrelationContext,
  PaymentAttempt,
  PaymentAttemptStatus
} from "@taps/contracts";
import type { ProviderRegistry } from "@taps/mcp";
import { requireProvider } from "@taps/mcp";
import { isPendingPaymentStatus } from "@taps/domain";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { buildPaymentIdempotencyKey, newId } from "../../lib/idempotency";
import type {
  AllocationPlanRepository,
  AuditRepository,
  PaymentAttemptRepository,
  PayerRepository,
  ReconciliationExceptionRepository
} from "../repositories";
import type { JobDispatcher } from "../jobs/job-dispatcher";
import { LoyaltyAgent } from "../loyalty/loyalty-agent";
import { PosIntegrationAgent } from "../pos/pos-integration-agent";

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentAttemptStatus>(["failed", "voided", "refunded"]);
const SUCCESS_PAYMENT_STATUSES = new Set<PaymentAttemptStatus>([
  "captured",
  "provider_succeeded_pending_pos",
  "reconciled"
]);

export class PaymentAgent {
  private readonly inFlightIntentCreations = new Map<string, Promise<PaymentAttempt>>();
  private readonly sessionIntentLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly payments: PaymentAttemptRepository,
    private readonly exceptions: ReconciliationExceptionRepository,
    private readonly audit: AuditRepository,
    private readonly providers: ProviderRegistry,
    private readonly posAgent: PosIntegrationAgent,
    private readonly plans: AllocationPlanRepository,
    private readonly payers: PayerRepository,
    private readonly loyaltyAgent: LoyaltyAgent,
    private readonly jobs: JobDispatcher
  ) {}

  async createPaymentIntent(input: {
    paymentProviderKey: string;
    context: CorrelationContext;
    sessionId: string;
    payerId: string;
    allocationPlan: AllocationPlan;
    check: CheckSnapshot;
    amountCents: number;
    tipCents: number;
    currency?: "USD";
  }): Promise<PaymentAttempt> {
    const baseIdempotencyKey = buildPaymentIdempotencyKey({
      sessionId: input.sessionId,
      payerId: input.payerId,
      checkVersion: input.check.version,
      allocationHash: input.allocationPlan.allocationHash,
      amountCents: input.amountCents + input.tipCents
    });
    const idempotencyKey = await this.resolveIntentIdempotencyKey(input.sessionId, baseIdempotencyKey);

    const existing = await this.payments.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    const inFlight = this.inFlightIntentCreations.get(idempotencyKey);
    if (inFlight) {
      return inFlight;
    }

    const creationPromise = this.withSessionIntentLock(input.sessionId, async () => {
      const lockedExisting = await this.payments.findByIdempotencyKey(idempotencyKey);
      if (lockedExisting) {
        return lockedExisting;
      }

      this.assertPlanMatchesCheck(input.allocationPlan, input.check);
      await this.assertPaymentAmountIsAvailable(input);
      return this.createPaymentIntentInternal(input, idempotencyKey);
    });
    this.inFlightIntentCreations.set(idempotencyKey, creationPromise);

    try {
      return await creationPromise;
    } finally {
      this.inFlightIntentCreations.delete(idempotencyKey);
    }
  }

  async capturePayment(input: {
    paymentAttemptId: string;
    paymentProviderKey: string;
    posProviderKey: string;
    posCheckId: string;
    currentCheckSnapshotId: string;
    currentCheckVersion: number;
    loyaltyProviderKey: string;
    context: CorrelationContext;
  }): Promise<PaymentAttempt> {
    const paymentAttempt = await this.payments.findById(input.paymentAttemptId);
    if (!paymentAttempt) {
      throw new NotFoundError(`Payment attempt ${input.paymentAttemptId} not found`);
    }

    if (!paymentAttempt.providerPaymentIntentId) {
      throw new ConflictError(`Payment attempt ${input.paymentAttemptId} has no provider intent`);
    }

    if (
      paymentAttempt.checkSnapshotId !== input.currentCheckSnapshotId ||
      paymentAttempt.checkVersion !== input.currentCheckVersion
    ) {
      throw new ConflictError(
        `Payment attempt ${paymentAttempt.id} is stale for check ${input.currentCheckSnapshotId}@${input.currentCheckVersion}`,
        "STALE_CHECK_VERSION"
      );
    }

    if (paymentAttempt.status === "reconciled") {
      return paymentAttempt;
    }

    if (SUCCESS_PAYMENT_STATUSES.has(paymentAttempt.status)) {
      return this.finalizeCapturedPayment({
        paymentAttempt,
        posProviderKey: input.posProviderKey,
        posCheckId: input.posCheckId,
        loyaltyProviderKey: input.loyaltyProviderKey,
        context: input.context
      });
    }

    if (!isPendingPaymentStatus(paymentAttempt.status)) {
      return paymentAttempt;
    }

    const paymentProvider = requireProvider(this.providers.payments, input.paymentProviderKey, "payment");
    const providerIntentResponse = await paymentProvider.retrieveIntent.execute({
      provider: input.paymentProviderKey,
      action: "retrieve_payment_intent",
      version: "1",
      timeoutMs: 5000,
      context: input.context,
      input: {
        restaurantId: input.context.restaurantId,
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId
      }
    });

    if (!providerIntentResponse.ok || !providerIntentResponse.output) {
      return this.markPaymentFailed(
        paymentAttempt,
        input.context,
        providerIntentResponse.errorCode,
        providerIntentResponse.errorMessage
      );
    }

    const providerIntent = providerIntentResponse.output;

    switch (providerIntent.status) {
      case "requires_payment_method":
      case "canceled":
        return this.markPaymentFailed(
          paymentAttempt,
          input.context,
          providerIntent.lastErrorCode ?? "PAYMENT_METHOD_REQUIRED",
          providerIntent.lastErrorMessage ?? "Payment was not completed with Stripe."
        );
      case "processing":
        return this.saveAttempt(paymentAttempt, {
          status: "authorization_pending",
          errorCode: undefined,
          errorMessage: undefined,
          failedAt: undefined
        });
      case "requires_action":
      case "requires_confirmation":
        throw new ConflictError("Payment has not been confirmed with Stripe yet.", "PAYMENT_NOT_CONFIRMED");
      case "succeeded": {
        const captured = await this.saveAttempt(paymentAttempt, {
          status: "captured",
          providerChargeId: providerIntent.providerChargeId ?? paymentAttempt.providerChargeId,
          capturedAt: paymentAttempt.capturedAt ?? new Date().toISOString(),
          errorCode: undefined,
          errorMessage: undefined,
          failedAt: undefined
        });
        return this.finalizeCapturedPayment({
          paymentAttempt: captured,
          posProviderKey: input.posProviderKey,
          posCheckId: input.posCheckId,
          loyaltyProviderKey: input.loyaltyProviderKey,
          context: input.context
        });
      }
      case "requires_capture":
      default:
        break;
    }

    const authorized = await this.saveAttempt(paymentAttempt, {
      status: "authorized",
      authorizedAt: paymentAttempt.authorizedAt ?? new Date().toISOString(),
      errorCode: undefined,
      errorMessage: undefined,
      failedAt: undefined
    });
    const capturePending = await this.saveAttempt(authorized, {
      status: "capture_pending"
    });

    const captureResponse = await paymentProvider.captureIntent.execute({
      provider: input.paymentProviderKey,
      action: "capture_payment",
      version: "1",
      timeoutMs: 5000,
      context: input.context,
      idempotencyKey: `paycap:${paymentAttempt.id}`,
      input: {
        restaurantId: input.context.restaurantId,
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId,
        amountCents: paymentAttempt.amountCents + paymentAttempt.tipCents
      }
    });

    if (!captureResponse.ok || !captureResponse.output) {
      return this.markPaymentFailed(
        capturePending,
        input.context,
        captureResponse.errorCode,
        captureResponse.errorMessage
      );
    }

    if (captureResponse.output.status === "processing") {
      return this.saveAttempt(capturePending, {
        providerChargeId: captureResponse.output.providerChargeId
      });
    }

    const captured = await this.saveAttempt(capturePending, {
      status: "captured",
      providerChargeId: captureResponse.output.providerChargeId,
      capturedAt: new Date().toISOString()
    });

    await this.audit.record({
      id: newId("audit"),
      restaurantId: input.context.restaurantId,
      sessionId: captured.sessionId,
      actorType: input.context.actor.type,
      actorId: input.context.actor.id,
      action: "payment.capture_succeeded",
      subjectType: "payment_attempt",
      subjectId: captured.id,
      correlationId: input.context.correlationId,
      payload: {
        providerChargeId: captured.providerChargeId,
        amountCents: captured.amountCents,
        tipCents: captured.tipCents
      },
      createdAt: new Date().toISOString()
    });

    return this.finalizeCapturedPayment({
      paymentAttempt: captured,
      posProviderKey: input.posProviderKey,
      posCheckId: input.posCheckId,
      loyaltyProviderKey: input.loyaltyProviderKey,
      context: input.context
    });
  }

  async reconcilePaymentState(input: {
    paymentAttemptId: string;
    resolved: boolean;
    loyaltyProviderKey: string;
    context: CorrelationContext;
  }): Promise<PaymentAttempt> {
    const paymentAttempt = await this.payments.findById(input.paymentAttemptId);
    if (!paymentAttempt) {
      throw new NotFoundError(`Payment attempt ${input.paymentAttemptId} not found`);
    }

    if (!input.resolved) {
      return paymentAttempt;
    }

    const reconciled = await this.saveAttempt(paymentAttempt, {
      status: "reconciled",
      posAttachmentStatus: "attached"
    });
    await this.afterCommittedPayment(reconciled, input.context, input.loyaltyProviderKey);
    await this.resolveOpenPosExceptions(reconciled.sessionId, reconciled.id);
    return reconciled;
  }

  async handleStripeWebhook(input: {
    paymentIntentId?: string;
    chargeId?: string;
    internalState: "captured" | "failed" | "refunded" | "processing" | "ignored";
    posProviderKey: string;
    loyaltyProviderKey: string;
    posCheckId?: string;
    context: CorrelationContext;
    eventId: string;
    eventType: string;
  }): Promise<{ handled: boolean; reason: string; paymentAttempt?: PaymentAttempt }> {
    if (!input.paymentIntentId) {
      return { handled: false, reason: "missing_payment_intent_id" };
    }

    const paymentAttempt = await this.payments.findByProviderPaymentIntentId("stripe", input.paymentIntentId);
    if (!paymentAttempt) {
      return { handled: false, reason: "payment_attempt_not_found" };
    }

    if (input.internalState === "ignored" || input.internalState === "refunded") {
      return {
        handled: false,
        reason: input.internalState === "ignored" ? "ignored_event_type" : "refund_not_implemented",
        paymentAttempt
      };
    }

    if (input.internalState === "failed") {
      if (SUCCESS_PAYMENT_STATUSES.has(paymentAttempt.status)) {
        return { handled: true, reason: "already_captured", paymentAttempt };
      }
      if (paymentAttempt.status === "failed") {
        return { handled: true, reason: "already_failed", paymentAttempt };
      }

      const failed = await this.markPaymentFailed(
        paymentAttempt,
        input.context,
        "STRIPE_PAYMENT_FAILED",
        "Stripe reported that the PaymentIntent failed."
      );
      await this.audit.record({
        id: newId("audit"),
        restaurantId: input.context.restaurantId,
        sessionId: failed.sessionId,
        actorType: input.context.actor.type,
        actorId: input.context.actor.id,
        action: "payment.webhook_failed",
        subjectType: "payment_attempt",
        subjectId: failed.id,
        idempotencyKey: `stripe_webhook:${input.eventId}`,
        correlationId: input.context.correlationId,
        payload: {
          eventId: input.eventId,
          eventType: input.eventType
        },
        createdAt: new Date().toISOString()
      });
      return { handled: true, reason: "payment_failed", paymentAttempt: failed };
    }

    if (input.internalState === "processing") {
      const updated = await this.saveAttempt(paymentAttempt, {
        status: "authorization_pending",
        errorCode: undefined,
        errorMessage: undefined,
        failedAt: undefined
      });
      return { handled: true, reason: "payment_processing", paymentAttempt: updated };
    }

    if (paymentAttempt.status === "reconciled") {
      return { handled: true, reason: "already_reconciled", paymentAttempt };
    }

    const captured = await this.saveAttempt(paymentAttempt, {
      status: "captured",
      providerChargeId: input.chargeId ?? paymentAttempt.providerChargeId,
      capturedAt: paymentAttempt.capturedAt ?? new Date().toISOString(),
      errorCode: undefined,
      errorMessage: undefined,
      failedAt: undefined
    });
    const finalized = await this.finalizeCapturedPayment({
      paymentAttempt: captured,
      posProviderKey: input.posProviderKey,
      posCheckId: input.posCheckId,
      loyaltyProviderKey: input.loyaltyProviderKey,
      context: input.context
    });
    await this.audit.record({
      id: newId("audit"),
      restaurantId: input.context.restaurantId,
      sessionId: finalized.sessionId,
      actorType: input.context.actor.type,
      actorId: input.context.actor.id,
      action: "payment.webhook_captured",
      subjectType: "payment_attempt",
      subjectId: finalized.id,
      idempotencyKey: `stripe_webhook:${input.eventId}`,
      correlationId: input.context.correlationId,
      payload: {
        eventId: input.eventId,
        eventType: input.eventType,
        providerChargeId: finalized.providerChargeId
      },
      createdAt: new Date().toISOString()
    });
    return { handled: true, reason: "payment_captured", paymentAttempt: finalized };
  }

  async handlePendingPayments(sessionId: string): Promise<PaymentAttempt[]> {
    return this.payments.listPendingBySession(sessionId);
  }

  private async createPaymentIntentInternal(
    input: {
      paymentProviderKey: string;
      context: CorrelationContext;
      sessionId: string;
      payerId: string;
      allocationPlan: AllocationPlan;
      check: CheckSnapshot;
      amountCents: number;
      tipCents: number;
      currency?: "USD";
    },
    idempotencyKey: string
  ): Promise<PaymentAttempt> {
    const existing = await this.payments.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing;
    }

    await this.ensurePlanFundingState(input.allocationPlan, "locked_for_payment");

    const paymentProvider = requireProvider(this.providers.payments, input.paymentProviderKey, "payment");
    const response = await paymentProvider.createIntent.execute({
      provider: input.paymentProviderKey,
      action: "create_payment_intent",
      version: "1",
      timeoutMs: 5000,
      idempotencyKey,
      context: input.context,
      input: {
        restaurantId: input.context.restaurantId,
        sessionId: input.sessionId,
        payerId: input.payerId,
        amountCents: input.amountCents,
        tipCents: input.tipCents,
        currency: input.currency ?? "USD"
      }
    });

    const attempt: PaymentAttempt = {
      id: newId("pay"),
      sessionId: input.sessionId,
      checkSnapshotId: input.check.id,
      checkVersion: input.check.version,
      payerId: input.payerId,
      allocationPlanId: input.allocationPlan.id,
      status: response.ok ? "intent_created" : "failed",
      amountCents: input.amountCents,
      tipCents: input.tipCents,
      currency: input.currency ?? "USD",
      provider: input.paymentProviderKey,
      providerPaymentIntentId: response.output?.providerPaymentIntentId,
      clientSecret: response.output?.clientSecret,
      posAttachmentStatus: "pending",
      idempotencyKey,
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
      failedAt: response.ok ? undefined : new Date().toISOString()
    };

    const saved = await this.payments.save(attempt);
    if (saved.status === "failed") {
      const latestPlan = await this.plans.findById(input.allocationPlan.id);
      if (latestPlan) {
        await this.ensurePlanFundingState(latestPlan);
      }
    }
    await this.audit.record({
      id: newId("audit"),
      restaurantId: input.context.restaurantId,
      sessionId: input.sessionId,
      actorType: input.context.actor.type,
      actorId: input.context.actor.id,
      action: "payment.intent_created",
      subjectType: "payment_attempt",
      subjectId: saved.id,
      idempotencyKey,
      correlationId: input.context.correlationId,
      payload: {
        amountCents: saved.amountCents,
        tipCents: saved.tipCents,
        providerPaymentIntentId: saved.providerPaymentIntentId
      },
      createdAt: new Date().toISOString()
    });

    return saved;
  }

  private async finalizeCapturedPayment(input: {
    paymentAttempt: PaymentAttempt;
    posProviderKey: string;
    posCheckId?: string;
    loyaltyProviderKey: string;
    context: CorrelationContext;
  }): Promise<PaymentAttempt> {
    if (input.paymentAttempt.status === "reconciled") {
      return input.paymentAttempt;
    }

    if (!input.posCheckId) {
      return this.markPosAttachmentDelayed(
        input.paymentAttempt,
        input.context,
        new Error("POS check id was unavailable while finalizing a captured payment.")
      );
    }

    try {
      await this.posAgent.attachPayment(
        input.posProviderKey,
        input.context,
        input.posCheckId,
        input.paymentAttempt.id,
        input.paymentAttempt.amountCents,
        input.paymentAttempt.tipCents
      );

      const reconciled = await this.saveAttempt(input.paymentAttempt, {
        status: "reconciled",
        posAttachmentStatus: "attached"
      });
      await this.resolveOpenPosExceptions(reconciled.sessionId, reconciled.id);
      await this.afterCommittedPayment(reconciled, input.context, input.loyaltyProviderKey);
      return reconciled;
    } catch (error) {
      return this.markPosAttachmentDelayed(input.paymentAttempt, input.context, error);
    }
  }

  private async markPosAttachmentDelayed(
    paymentAttempt: PaymentAttempt,
    context: CorrelationContext,
    error: unknown
  ): Promise<PaymentAttempt> {
    const openExceptions = await this.exceptions.listOpenBySession(paymentAttempt.sessionId);
    const existing = openExceptions.find(
      (candidate) =>
        candidate.paymentAttemptId === paymentAttempt.id && candidate.type === "payment_pos_attach_delayed"
    );

    if (!existing) {
      await this.exceptions.create({
        id: newId("rex"),
        restaurantId: context.restaurantId,
        sessionId: paymentAttempt.sessionId,
        checkSnapshotId: paymentAttempt.checkSnapshotId,
        paymentAttemptId: paymentAttempt.id,
        type: "payment_pos_attach_delayed",
        severity: "warning",
        status: "open",
        summary: "Payment captured but POS attachment is delayed",
        details: {
          message: error instanceof Error ? error.message : "Unknown POS attachment error"
        },
        detectedAt: new Date().toISOString()
      });
    }

    const pendingPos = await this.saveAttempt(paymentAttempt, {
      status: "provider_succeeded_pending_pos",
      posAttachmentStatus: "failed"
    });
    await this.jobs.enqueue({
      name: "payment.reconcile_pos_attach",
      payload: {
        paymentAttemptId: pendingPos.id,
        sessionId: pendingPos.sessionId
      },
      dedupeKey: `pay_reconcile:${pendingPos.id}`
    });

    if (!existing) {
      await this.audit.record({
        id: newId("audit"),
        restaurantId: context.restaurantId,
        sessionId: pendingPos.sessionId,
        actorType: context.actor.type,
        actorId: context.actor.id,
        action: "payment.pos_attach_pending",
        subjectType: "payment_attempt",
        subjectId: pendingPos.id,
        correlationId: context.correlationId,
        payload: {
          amountCents: pendingPos.amountCents,
          message: error instanceof Error ? error.message : "Unknown POS attachment error"
        },
        createdAt: new Date().toISOString()
      });
    }

    return pendingPos;
  }

  private async resolveOpenPosExceptions(sessionId: string, paymentAttemptId: string): Promise<void> {
    const openExceptions = await this.exceptions.listOpenBySession(sessionId);
    const nowIso = new Date().toISOString();
    for (const exception of openExceptions.filter((candidate) => candidate.paymentAttemptId === paymentAttemptId)) {
      await this.exceptions.resolve(exception.id, nowIso);
    }
  }

  private async markPaymentFailed(
    paymentAttempt: PaymentAttempt,
    context: CorrelationContext,
    errorCode?: string,
    errorMessage?: string
  ): Promise<PaymentAttempt> {
    const failed = await this.saveAttempt(paymentAttempt, {
      status: "failed",
      failedAt: new Date().toISOString(),
      errorCode,
      errorMessage
    });
    const plan = await this.plans.findById(failed.allocationPlanId);
    if (plan) {
      await this.ensurePlanFundingState(plan);
      await this.syncPayerSettlementState(plan, failed.payerId);
    }
    await this.audit.record({
      id: newId("audit"),
      restaurantId: context.restaurantId,
      sessionId: failed.sessionId,
      actorType: context.actor.type,
      actorId: context.actor.id,
      action: "payment.capture_failed",
      subjectType: "payment_attempt",
      subjectId: failed.id,
      correlationId: context.correlationId,
      payload: {
        errorCode,
        errorMessage
      },
      createdAt: new Date().toISOString()
    });
    return failed;
  }

  private assertPlanMatchesCheck(plan: AllocationPlan, check: CheckSnapshot): void {
    if (plan.checkSnapshotId !== check.id || plan.checkVersion !== check.version || plan.status === "invalidated") {
      throw new ConflictError("Allocation plan is stale for the current check", "STALE_CHECK_VERSION");
    }

    if (plan.status === "completed") {
      throw new ConflictError(`Allocation plan ${plan.id} is already fully funded`, "ALLOCATION_COMPLETED");
    }
  }

  private async assertPaymentAmountIsAvailable(input: {
    sessionId: string;
    payerId: string;
    allocationPlan: AllocationPlan;
    check: CheckSnapshot;
    amountCents: number;
  }): Promise<void> {
    if (input.amountCents > input.check.remainingBalanceCents) {
      throw new ConflictError(
        `Requested amount ${input.amountCents} exceeds current remaining balance ${input.check.remainingBalanceCents}`,
        "PAYMENT_EXCEEDS_REMAINING_BALANCE"
      );
    }

    const sessionPayments = await this.payments.listBySession(input.sessionId);
    const pendingReservedCents = sessionPayments
      .filter((payment) => isPendingPaymentStatus(payment.status))
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const availableAfterReservations = Math.max(input.check.remainingBalanceCents - pendingReservedCents, 0);

    if (input.amountCents > availableAfterReservations) {
      throw new ConflictError(
        `Requested amount ${input.amountCents} exceeds available balance ${availableAfterReservations} after pending reservations`,
        "PAYMENT_BALANCE_RESERVED"
      );
    }

    const payerOutstanding = this.computePayerOutstandingAmount(input.allocationPlan, input.payerId, sessionPayments);
    if (payerOutstanding <= 0) {
      throw new ConflictError(`Payer ${input.payerId} has no outstanding allocation on plan ${input.allocationPlan.id}`);
    }

    if (input.amountCents > payerOutstanding) {
      throw new ConflictError(
        `Requested amount ${input.amountCents} exceeds payer outstanding allocation ${payerOutstanding}`,
        "PAYMENT_EXCEEDS_PAYER_ALLOCATION"
      );
    }
  }

  private computePayerOutstandingAmount(
    plan: AllocationPlan,
    payerId: string,
    sessionPayments: PaymentAttempt[]
  ): number {
    const payerAssignedCents = plan.entries
      .filter((entry) => entry.payerId === payerId)
      .reduce((sum, entry) => sum + entry.assignedCents, 0);
    const payerReservedCents = sessionPayments
      .filter(
        (payment) =>
          payment.allocationPlanId === plan.id &&
          payment.payerId === payerId &&
          !TERMINAL_PAYMENT_STATUSES.has(payment.status)
      )
      .reduce((sum, payment) => sum + payment.amountCents, 0);

    return Math.max(payerAssignedCents - payerReservedCents, 0);
  }

  private async afterCommittedPayment(
    paymentAttempt: PaymentAttempt,
    context: CorrelationContext,
    loyaltyProviderKey: string
  ): Promise<void> {
    const plan = await this.plans.findById(paymentAttempt.allocationPlanId);
    if (plan) {
      await this.ensurePlanFundingState(plan);
      await this.syncPayerSettlementState(plan, paymentAttempt.payerId);
    }

    await this.loyaltyAgent.awardPointsForCommittedPayments({
      loyaltyProviderKey,
      context,
      sessionId: paymentAttempt.sessionId,
      payerId: paymentAttempt.payerId
    });

    await this.audit.record({
      id: newId("audit"),
      restaurantId: context.restaurantId,
      sessionId: paymentAttempt.sessionId,
      actorType: context.actor.type,
      actorId: context.actor.id,
      action: "payment.reconciled",
      subjectType: "payment_attempt",
      subjectId: paymentAttempt.id,
      correlationId: context.correlationId,
      payload: {
        amountCents: paymentAttempt.amountCents,
        tipCents: paymentAttempt.tipCents,
        allocationPlanId: paymentAttempt.allocationPlanId
      },
      createdAt: new Date().toISOString()
    });
  }

  private async ensurePlanFundingState(plan: AllocationPlan, forcedStatus?: AllocationPlan["status"]): Promise<void> {
    const sessionPayments = await this.payments.listBySession(plan.sessionId);
    const committedCents = sessionPayments
      .filter((payment) => payment.allocationPlanId === plan.id && payment.status === "reconciled")
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const hasPendingPayments = sessionPayments.some(
      (payment) => payment.allocationPlanId === plan.id && isPendingPaymentStatus(payment.status)
    );
    const planAssignedCents = plan.entries.reduce((sum, entry) => sum + entry.assignedCents, 0);

    const nextStatus =
      forcedStatus ??
      (committedCents >= planAssignedCents && planAssignedCents > 0
        ? "completed"
        : committedCents > 0
          ? "partially_funded"
          : hasPendingPayments
            ? "locked_for_payment"
            : plan.entries.length > 0
              ? "proposed"
              : "draft");

    if (nextStatus === plan.status && !forcedStatus) {
      return;
    }

    await this.plans.save({
      ...plan,
      status: nextStatus,
      version: plan.version + (nextStatus === plan.status ? 0 : 1)
    });
  }

  private async syncPayerSettlementState(plan: AllocationPlan, payerId: string): Promise<void> {
    const payer = await this.payers.findById(payerId);
    if (!payer || payer.status === "left") {
      return;
    }

    const sessionPayments = await this.payments.listBySession(plan.sessionId);
    const payerAssignedCents = plan.entries
      .filter((entry) => entry.payerId === payerId)
      .reduce((sum, entry) => sum + entry.assignedCents, 0);
    const payerCommittedCents = sessionPayments
      .filter((payment) => payment.allocationPlanId === plan.id && payment.payerId === payerId && payment.status === "reconciled")
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const nextStatus = payerAssignedCents > 0 && payerCommittedCents >= payerAssignedCents ? "completed" : "active";

    if (payer.status === nextStatus) {
      return;
    }

    await this.payers.save({
      ...payer,
      status: nextStatus
    });
  }

  private async resolveIntentIdempotencyKey(sessionId: string, baseIdempotencyKey: string): Promise<string> {
    const sessionPayments = await this.payments.listBySession(sessionId);
    const matchingAttempts = sessionPayments.filter(
      (payment) =>
        payment.idempotencyKey === baseIdempotencyKey ||
        payment.idempotencyKey.startsWith(`${baseIdempotencyKey}:retry:`)
    );

    const latestReusableAttempt = [...matchingAttempts]
      .reverse()
      .find((payment) => !TERMINAL_PAYMENT_STATUSES.has(payment.status));

    if (latestReusableAttempt) {
      return latestReusableAttempt.idempotencyKey;
    }

    return matchingAttempts.length === 0
      ? baseIdempotencyKey
      : `${baseIdempotencyKey}:retry:${matchingAttempts.length}`;
  }

  private async saveAttempt(paymentAttempt: PaymentAttempt, updates: Partial<PaymentAttempt>): Promise<PaymentAttempt> {
    const nextAttempt = {
      ...paymentAttempt,
      ...updates
    };

    const changed = (Object.keys(updates) as (keyof PaymentAttempt)[]).some(
      (key) => paymentAttempt[key] !== nextAttempt[key]
    );

    if (!changed) {
      return paymentAttempt;
    }

    return this.payments.save(nextAttempt);
  }

  private async withSessionIntentLock<T>(sessionId: string, work: () => Promise<T>): Promise<T> {
    const previousLock = this.sessionIntentLocks.get(sessionId) ?? Promise.resolve();
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const queuedLock = previousLock.then(() => currentLock);
    this.sessionIntentLocks.set(sessionId, queuedLock);

    await previousLock;

    try {
      return await work();
    } finally {
      releaseLock();
      if (this.sessionIntentLocks.get(sessionId) === queuedLock) {
        this.sessionIntentLocks.delete(sessionId);
      }
    }
  }
}
