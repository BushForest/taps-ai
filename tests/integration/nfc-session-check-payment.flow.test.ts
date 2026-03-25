import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";

describe("NFC session -> check -> split -> payment flow", () => {
  it("creates a session, retrieves a check, splits it, captures a payment, and attaches loyalty", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-test",
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
      id: "payer_alex",
      sessionId: session.id,
      displayName: "Alex",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const paymentIntent = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 200
    });

    const captured = await container.agents.paymentAgent.capturePayment({
      paymentAttemptId: paymentIntent.id,
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      posProviderKey: container.restaurantConfig.posProviderKey,
      posCheckId: check.posCheckId,
      currentCheckSnapshotId: check.id,
      currentCheckVersion: check.version,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId }
    });

    const loyalty = await container.agents.loyaltyAgent.attachLoyaltyToSession({
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      phoneNumber: "(555) 123-4567"
    });

    expect(session.status).toBe("active");
    expect(check.totalCents).toBeGreaterThan(0);
    expect(paymentIntent.status).toBe("intent_created");
    expect(captured.status).toBe("reconciled");
    expect(loyalty.phoneE164).toBe("+15551234567");
    expect(loyalty.pointsBalance).toBe(12);
  });

  it("marks a payer complete while leaving the table partially paid until the full check settles", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-test",
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
      id: "payer_casey",
      sessionId: session.id,
      displayName: "Casey",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const paymentIntent = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 0
    });

    await container.agents.paymentAgent.capturePayment({
      paymentAttemptId: paymentIntent.id,
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      posProviderKey: container.restaurantConfig.posProviderKey,
      posCheckId: check.posCheckId,
      currentCheckSnapshotId: check.id,
      currentCheckVersion: check.version,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId }
    });

    const refreshed = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...context, actor: { type: "system", id: "post_payment_refresh" }, restaurantId: session.restaurantId },
      session
    )).snapshot;
    const normalized = container.agents.checkAgent.buildGuestCheckSnapshot(refreshed, plan);
    const syncedSession = await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: normalized.amountPaidCents,
      remainingBalanceCents: normalized.remainingBalanceCents,
      hasPendingPayments: false
    });
    const payerAfter = await container.repositories.payers.findById(payer.id);
    const closeValidation = container.agents.splitAgent.enforceCloseRules({
      check: normalized,
      plan,
      hasPendingPayments: false,
      hasBlockingMismatch: false
    });

    expect(payerAfter?.status).toBe("completed");
    expect(syncedSession.status).toBe("partially_paid");
    expect(closeValidation.canClose).toBe(false);
    expect(normalized.remainingBalanceCents).toBe(check.totalCents - 1200);
  });

  it("rejects capture when the payment attempt is stale against the latest check snapshot", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-test",
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
      id: "payer_stale",
      sessionId: session.id,
      displayName: "Stale",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const paymentIntent = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 0
    });

    await expect(
      container.agents.paymentAgent.capturePayment({
        paymentAttemptId: paymentIntent.id,
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        posProviderKey: container.restaurantConfig.posProviderKey,
        posCheckId: check.posCheckId,
        currentCheckSnapshotId: "check_new_version",
        currentCheckVersion: check.version + 1,
        loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
        context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId }
      })
    ).rejects.toMatchObject({
      code: "STALE_CHECK_VERSION"
    });
  });

  it("rejects payment intent creation when a split plan was built against an older check version", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-test",
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
      id: "payer_old_plan",
      sessionId: session.id,
      displayName: "Older Plan",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const changedCheck = {
      ...check,
      version: check.version + 1,
      sourceCheckVersion: String(check.version + 1),
      totalCents: check.totalCents + 100,
      remainingBalanceCents: check.remainingBalanceCents + 100,
      updatedAt: new Date().toISOString()
    };

    await expect(
      container.agents.paymentAgent.createPaymentIntent({
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
        sessionId: session.id,
        payerId: payer.id,
        allocationPlan: plan,
        check: changedCheck,
        amountCents: 1200,
        tipCents: 0
      })
    ).rejects.toMatchObject({
      code: "STALE_CHECK_VERSION"
    });
  });

  it("creates a fresh retry intent after a failed attempt with the same base allocation", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-test",
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
      id: "payer_retry",
      sessionId: session.id,
      displayName: "Retry Guest",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const initialAttempt = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 0
    });

    await container.repositories.paymentAttempts.save({
      ...initialAttempt,
      status: "failed",
      failedAt: new Date().toISOString(),
      errorCode: "CARD_DECLINED",
      errorMessage: "The test card was declined."
    });

    const retryAttempt = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 0
    });

    expect(retryAttempt.id).not.toBe(initialAttempt.id);
    expect(retryAttempt.idempotencyKey).not.toBe(initialAttempt.idempotencyKey);
    expect(retryAttempt.idempotencyKey).toContain(":retry:");
    expect(retryAttempt.status).toBe("intent_created");
  });
});
