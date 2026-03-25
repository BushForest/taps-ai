import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";

describe("Concurrent payment attempts", () => {
  it("deduplicates duplicate create-intent calls with the same idempotency surface", async () => {
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
      id: "payer_dupe",
      sessionId: session.id,
      displayName: "Jordan",
      status: "active"
    });

    const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);

    const [first, second] = await Promise.all([
      container.agents.paymentAgent.createPaymentIntent({
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
        sessionId: session.id,
        payerId: payer.id,
        allocationPlan: plan,
        check,
        amountCents: 1200,
        tipCents: 0
      }),
      container.agents.paymentAgent.createPaymentIntent({
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        context: { ...context, actor: { type: "guest", id: payer.id }, restaurantId: session.restaurantId },
        sessionId: session.id,
        payerId: payer.id,
        allocationPlan: plan,
        check,
        amountCents: 1200,
        tipCents: 0
      })
    ]);

    expect(first.id).toBe(second.id);
  });

  it("serializes session reservations so concurrent payers cannot over-reserve the remaining balance", async () => {
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

    const payerA = await container.repositories.payers.save({
      id: "payer_reserve_a",
      sessionId: session.id,
      displayName: "Avery",
      status: "active"
    });
    const payerB = await container.repositories.payers.save({
      id: "payer_reserve_b",
      sessionId: session.id,
      displayName: "Blake",
      status: "active"
    });

    const planA = await container.agents.splitAgent.customAllocateAmount(check, payerA.id, 4000);
    const planB = await container.agents.splitAgent.customAllocateAmount(check, payerB.id, 2000);

    const results = await Promise.allSettled([
      container.agents.paymentAgent.createPaymentIntent({
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        context: { ...context, actor: { type: "guest", id: payerA.id }, restaurantId: session.restaurantId },
        sessionId: session.id,
        payerId: payerA.id,
        allocationPlan: planA,
        check,
        amountCents: 4000,
        tipCents: 0
      }),
      container.agents.paymentAgent.createPaymentIntent({
        paymentProviderKey: container.restaurantConfig.paymentProviderKey,
        context: { ...context, actor: { type: "guest", id: payerB.id }, restaurantId: session.restaurantId },
        sessionId: session.id,
        payerId: payerB.id,
        allocationPlan: planB,
        check,
        amountCents: 2000,
        tipCents: 0
      })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: {
        code: "PAYMENT_BALANCE_RESERVED"
      }
    });
  });
});
