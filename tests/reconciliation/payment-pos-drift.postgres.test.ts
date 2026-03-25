import { afterEach, describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";
import { runPaymentReconciliationWorker } from "../../apps/api/src/modules/workers/payment-reconciliation.worker";
import { createPgMemDb } from "../helpers/pg-mem";

describe("Payment/POS reconciliation with Postgres-backed repositories", () => {
  let disposeDb: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (disposeDb) {
      await disposeDb();
      disposeDb = undefined;
    }
  });

  it("persists a delayed POS attach and resolves it through the reconciliation worker", async () => {
    const { db, dispose } = await createPgMemDb();
    disposeDb = dispose;

    const container = createContainer({
      dataStoreDriver: "postgres",
      dbClient: db
    });
    const originalAttachPayment = container.providers.pos.memory.attachPayment.execute;
    container.providers.pos.memory.attachPayment.execute = async (request) => ({
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
      id: "payer_pg_recon",
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

    expect(captured.status).toBe("provider_succeeded_pending_pos");
    expect(await container.repositories.exceptions.listOpenBySession(session.id)).toHaveLength(1);

    container.providers.pos.memory.attachPayment.execute = originalAttachPayment;

    const reconciled = await runPaymentReconciliationWorker(container, paymentIntent.id);
    const refreshedCheck = await container.repositories.checks.findLatestBySession(session.id);
    const refreshedSession = await container.repositories.sessions.findById(session.id);

    expect(reconciled.status).toBe("reconciled");
    expect(refreshedCheck?.remainingBalanceCents).toBe(4200);
    expect(refreshedSession?.status).toBe("partially_paid");
    expect(await container.repositories.exceptions.listOpenBySession(session.id)).toHaveLength(0);
  });
});
