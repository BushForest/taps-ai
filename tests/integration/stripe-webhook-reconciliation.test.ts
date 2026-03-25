import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { AppContainer } from "../../apps/api/src/bootstrap/create-container";
import { createApp } from "../../apps/api/src/bootstrap/create-app";
import { newId } from "../../apps/api/src/lib/idempotency";

function parseJson<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

function signStripePayload(payload: string, webhookSecret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

async function seedStripeAttempt(container: AppContainer, paymentAttemptId: string, providerPaymentIntentId: string) {
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
    id: newId("payer"),
    sessionId: session.id,
    displayName: "Stripe Guest",
    status: "active"
  });

  const plan = await container.agents.splitAgent.customAllocateAmount(check, payer.id, 1200);

  const paymentAttempt = await container.repositories.paymentAttempts.save({
    id: paymentAttemptId,
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
    providerPaymentIntentId,
    clientSecret: `${providerPaymentIntentId}_secret_demo`,
    posAttachmentStatus: "pending",
    idempotencyKey: `seed:${paymentAttemptId}`
  });

  return {
    session,
    check,
    payer,
    plan,
    paymentAttempt
  };
}

describe("Stripe webhook reconciliation", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("reconciles a succeeded PaymentIntent into the durable payment ledger", async () => {
    const webhookSecret = "whsec_123";
    const created = await createApp(undefined, {
      stripe: {
        webhookSecret
      }
    });
    app = created.app;

    const seeded = await seedStripeAttempt(created.container, "pay_webhook_success", "pi_webhook_success");
    const payload = JSON.stringify({
      id: "evt_success_123",
      type: "payment_intent.succeeded",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        object: {
          id: seeded.paymentAttempt.providerPaymentIntentId,
          latest_charge: "ch_webhook_success"
        }
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: {
        "stripe-signature": signStripePayload(payload, webhookSecret)
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = parseJson<{ handled: boolean; reason: string; paymentStatus?: string }>(response.payload);
    expect(body.handled).toBe(true);
    expect(body.reason).toBe("payment_captured");
    expect(body.paymentStatus).toBe("reconciled");

    const paymentAttempt = await created.container.repositories.paymentAttempts.findById(seeded.paymentAttempt.id);
    expect(paymentAttempt?.status).toBe("reconciled");
    expect(paymentAttempt?.providerChargeId).toBe("ch_webhook_success");
  });

  it("marks a failed PaymentIntent attempt as failed", async () => {
    const webhookSecret = "whsec_123";
    const created = await createApp(undefined, {
      stripe: {
        webhookSecret
      }
    });
    app = created.app;

    const seeded = await seedStripeAttempt(created.container, "pay_webhook_failed", "pi_webhook_failed");
    await created.container.repositories.paymentAttempts.save({
      ...seeded.paymentAttempt,
      status: "intent_created"
    });

    const payload = JSON.stringify({
      id: "evt_failed_123",
      type: "payment_intent.payment_failed",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        object: {
          id: seeded.paymentAttempt.providerPaymentIntentId,
          latest_charge: "ch_webhook_failed"
        }
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: {
        "stripe-signature": signStripePayload(payload, webhookSecret)
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    const body = parseJson<{ handled: boolean; reason: string; paymentStatus?: string }>(response.payload);
    expect(body.handled).toBe(true);
    expect(body.reason).toBe("payment_failed");
    expect(body.paymentStatus).toBe("failed");

    const paymentAttempt = await created.container.repositories.paymentAttempts.findById(seeded.paymentAttempt.id);
    expect(paymentAttempt?.status).toBe("failed");
    expect(paymentAttempt?.errorCode).toBe("STRIPE_PAYMENT_FAILED");
  });
});
