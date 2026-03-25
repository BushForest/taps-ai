import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";
import { drainInMemoryJobs } from "../../apps/api/src/modules/jobs/job-runner";

describe("Queue-driven background jobs in memory mode", () => {
  it("reconciles delayed POS attachments through the queued worker path", async () => {
    const container = createContainer();
    const memoryPos = container.providers.pos.memory!;
    const originalAttachPayment = memoryPos.attachPayment.execute;
    memoryPos.attachPayment.execute = async (request) => ({
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
        id: "guest_queue"
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
      context,
      session,
      true
    );
    const payer = await container.repositories.payers.save({
      id: "payer_queue_demo",
      sessionId: session.id,
      displayName: "Morgan",
      status: "active"
    });
    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);
    const paymentAttempt = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id } },
      sessionId: session.id,
      payerId: payer.id,
      allocationPlan: plan,
      check,
      amountCents: 1200,
      tipCents: 0
    });

    const captured = await container.agents.paymentAgent.capturePayment({
      paymentAttemptId: paymentAttempt.id,
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      posProviderKey: container.restaurantConfig.posProviderKey,
      posCheckId: check.posCheckId,
      currentCheckSnapshotId: check.id,
      currentCheckVersion: check.version,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...context, actor: { type: "guest", id: payer.id } }
    });

    expect(captured.status).toBe("provider_succeeded_pending_pos");
    expect((await container.jobs.listQueued("payment.reconcile_pos_attach")).length).toBe(1);

    memoryPos.attachPayment.execute = originalAttachPayment;

    const firstDrain = await drainInMemoryJobs(container);
    expect(firstDrain.processed).toBe(1);
    expect(firstDrain.failed).toBe(0);

    const reconciled = await container.repositories.paymentAttempts.findById(paymentAttempt.id);
    expect(reconciled?.status).toBe("reconciled");
    expect(await container.repositories.exceptions.listOpenBySession(session.id)).toHaveLength(0);
  });

  it("expires public access and archives closed sessions via queued lifecycle jobs", async () => {
    const container = createContainer();
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: {
        type: "guest" as const,
        id: "guest_lifecycle"
      }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      context,
      {
        publicGraceMinutes: 0,
        supportRetentionDays: 0
      }
    );
    await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 5400,
      remainingBalanceCents: 0,
      hasPendingPayments: false
    });
    await container.agents.sessionAgent.closeSession(session.id, {
      publicGraceMinutes: 0,
      supportRetentionDays: 0
    });

    expect((await container.jobs.listQueued()).map((job) => job.name).sort()).toEqual([
      "session.archive",
      "session.expire_public_access"
    ]);

    const drain = await drainInMemoryJobs(container, { limit: 10 });
    expect(drain.processed).toBe(2);
    const archived = await container.repositories.sessions.findById(session.id);
    expect(archived?.status).toBe("archived");
  });
});
