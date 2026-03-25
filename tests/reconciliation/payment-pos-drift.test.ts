import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";
import { runPaymentReconciliationWorker } from "../../apps/api/src/modules/workers/payment-reconciliation.worker";

describe("Payment/POS reconciliation", () => {
  it("marks provider success as pending POS reconciliation when writeback fails", async () => {
    const container = createContainer();
    const memoryPos1 = container.providers.pos.memory!;
    const originalAttachPayment = memoryPos1.attachPayment.execute;
    memoryPos1.attachPayment.execute = async (request) => ({
      ok: false,
      provider: request.provider,
      action: request.action,
      version: request.version,
      retryable: true,
      providerTimestamp: new Date().toISOString(),
      errorCode: "TEMPORARY_FAILURE",
      errorMessage: "Simulated POS outage"
    });

    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_demo"
      }
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
      id: "payer_recon",
      sessionId: session.id,
      displayName: "Morgan",
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

    const openExceptions = await container.repositories.exceptions.listOpenBySession(session.id);

    expect(captured.status).toBe("provider_succeeded_pending_pos");
    expect(openExceptions).toHaveLength(1);
    expect(await container.jobs.listQueued("payment.reconcile_pos_attach")).toHaveLength(1);

    memoryPos1.attachPayment.execute = originalAttachPayment;
  });

  it("retries delayed POS attachment and resynchronizes session state when reconciliation succeeds", async () => {
    const container = createContainer();
    const memoryPos2 = container.providers.pos.memory!;
    const originalAttachPayment = memoryPos2.attachPayment.execute;
    memoryPos2.attachPayment.execute = async (request) => ({
      ok: false,
      provider: request.provider,
      action: request.action,
      version: request.version,
      retryable: true,
      providerTimestamp: new Date().toISOString(),
      errorCode: "TEMPORARY_FAILURE",
      errorMessage: "Simulated POS outage"
    });

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
      id: "payer_recon_retry",
      sessionId: session.id,
      displayName: "Morgan",
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

    memoryPos2.attachPayment.execute = originalAttachPayment;

    const reconciled = await runPaymentReconciliationWorker(container, paymentIntent.id);
    const refreshedCheck = await container.repositories.checks.findLatestBySession(session.id);
    const updatedSession = await container.repositories.sessions.findById(session.id);
    const remainingExceptions = await container.repositories.exceptions.listOpenBySession(session.id);

    expect(reconciled.status).toBe("reconciled");
    expect(refreshedCheck?.remainingBalanceCents).toBe(check.totalCents - 1200);
    expect(updatedSession?.status).toBe("partially_paid");
    expect(remainingExceptions).toHaveLength(0);
  });
});
