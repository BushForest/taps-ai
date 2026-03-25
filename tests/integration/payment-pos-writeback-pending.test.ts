import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";

/**
 * Verifies the "payment captured, POS sync delayed" path:
 *   Stripe confirms → our capture succeeds → POS attachPayment unavailable
 *   → payment lands in provider_succeeded_pending_pos
 *   → reconciliation exception created
 *   → reconciliation job queued
 */
describe("Payment with pending POS writeback", () => {
  async function seedPaymentAttempt(container: ReturnType<typeof createContainer>) {
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: { type: "guest" as const, id: "guest_demo" }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      context,
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    const check = await container.agents.checkAgent.fetchOrCreateOpenCheck(
      container.restaurantConfig.posProviderKey,
      { ...context, restaurantId: session.restaurantId },
      session,
      true
    );

    const payer = await container.repositories.payers.save({
      id: newId("payer"),
      sessionId: session.id,
      displayName: "Guest",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);

    const intentId = `pi_test_${newId("intent")}`;
    const paymentAttempt = await container.repositories.paymentAttempts.save({
      id: newId("pay"),
      sessionId: session.id,
      checkSnapshotId: check.id,
      checkVersion: check.version,
      payerId: payer.id,
      allocationPlanId: plan.id,
      status: "capture_pending",
      amountCents: 1200,
      tipCents: 0,
      currency: "USD",
      provider: "stripe",
      providerPaymentIntentId: intentId,
      clientSecret: `${intentId}_secret`,
      posAttachmentStatus: "pending",
      idempotencyKey: `seed:${intentId}`
    });

    return { session, check, payer, plan, paymentAttempt, intentId, context };
  }

  it("sets status to provider_succeeded_pending_pos when POS check id is unavailable", async () => {
    const container = createContainer();
    const { paymentAttempt, intentId, context } = await seedPaymentAttempt(container);

    const result = await container.agents.paymentAgent.handleStripeWebhook({
      paymentIntentId: intentId,
      chargeId: "ch_test_delayed",
      internalState: "captured",
      posProviderKey: container.restaurantConfig.posProviderKey,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      posCheckId: undefined, // simulate: check id not available at webhook time
      context: { ...context, correlationId: `stripe:evt_test_delayed` },
      eventId: "evt_test_delayed",
      eventType: "payment_intent.succeeded"
    });

    expect(result.handled).toBe(true);
    expect(result.paymentAttempt?.status).toBe("provider_succeeded_pending_pos");
    expect(result.paymentAttempt?.posAttachmentStatus).toBe("failed");
  });

  it("creates a reconciliation exception when POS writeback is delayed", async () => {
    const container = createContainer();
    const { paymentAttempt, intentId, context } = await seedPaymentAttempt(container);

    await container.agents.paymentAgent.handleStripeWebhook({
      paymentIntentId: intentId,
      chargeId: "ch_test_delayed_exc",
      internalState: "captured",
      posProviderKey: container.restaurantConfig.posProviderKey,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      posCheckId: undefined,
      context: { ...context, correlationId: "stripe:evt_exc" },
      eventId: "evt_exc",
      eventType: "payment_intent.succeeded"
    });

    const exceptions = await container.repositories.exceptions.listOpenBySession(paymentAttempt.sessionId);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]?.type).toBe("payment_pos_attach_delayed");
    expect(exceptions[0]?.status).toBe("open");
    expect(exceptions[0]?.paymentAttemptId).toBe(paymentAttempt.id);
  });

  it("enqueues a reconciliation job when POS writeback is delayed", async () => {
    const container = createContainer();
    const { paymentAttempt, intentId, context } = await seedPaymentAttempt(container);

    await container.agents.paymentAgent.handleStripeWebhook({
      paymentIntentId: intentId,
      chargeId: "ch_test_delayed_job",
      internalState: "captured",
      posProviderKey: container.restaurantConfig.posProviderKey,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      posCheckId: undefined,
      context: { ...context, correlationId: "stripe:evt_job" },
      eventId: "evt_job",
      eventType: "payment_intent.succeeded"
    });

    const queued = await container.jobs.listQueued("payment.reconcile_pos_attach");
    expect(queued).toHaveLength(1);
    expect(queued[0]?.payload).toMatchObject({ sessionId: paymentAttempt.sessionId });
  });

  it("does not create duplicate exceptions when the same delayed webhook fires twice", async () => {
    const container = createContainer();
    const { intentId, context } = await seedPaymentAttempt(container);

    const webhookInput = {
      paymentIntentId: intentId,
      chargeId: "ch_test_dup",
      internalState: "captured" as const,
      posProviderKey: container.restaurantConfig.posProviderKey,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      posCheckId: undefined,
      context: { ...context, correlationId: "stripe:evt_dup" },
      eventId: "evt_dup",
      eventType: "payment_intent.succeeded"
    };

    await container.agents.paymentAgent.handleStripeWebhook(webhookInput);
    await container.agents.paymentAgent.handleStripeWebhook({
      ...webhookInput,
      eventId: "evt_dup_2",
      context: { ...context, correlationId: "stripe:evt_dup_2" }
    });

    const sessionId = (await container.repositories.paymentAttempts.findByProviderPaymentIntentId("stripe", intentId))!.sessionId;
    const exceptions = await container.repositories.exceptions.listOpenBySession(sessionId);
    expect(exceptions).toHaveLength(1); // idempotent — no duplicate
  });
});
