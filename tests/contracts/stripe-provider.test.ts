import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStripeCompatiblePaymentProvider,
  mapStripeWebhookEvent,
  verifyStripeWebhookSignature
} from "../../packages/mcp/src/providers/stripe-payment-provider";

describe("Stripe payment provider contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a manual-capture card PaymentIntent with Taps metadata", async () => {
    const provider = createStripeCompatiblePaymentProvider({
      secretKey: "sk_test_123"
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "pi_123",
          client_secret: "pi_123_secret_abc",
          status: "requires_payment_method"
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await provider.createIntent.execute({
      provider: "stripe",
      action: "create_payment_intent",
      version: "1",
      timeoutMs: 5000,
      idempotencyKey: "intent_123",
      context: {
        correlationId: "corr_123",
        restaurantId: "rest_demo",
        actor: {
          type: "guest",
          id: "payer_123"
        }
      },
      input: {
        restaurantId: "rest_demo",
        sessionId: "sess_123",
        payerId: "payer_123",
        amountCents: 1500,
        tipCents: 200,
        currency: "USD"
      }
    });

    expect(response.ok).toBe(true);
    expect(response.output?.providerPaymentIntentId).toBe("pi_123");
    expect(response.output?.clientSecret).toBe("pi_123_secret_abc");
    expect(response.output?.status).toBe("requires_payment_method");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = (fetchMock.mock.calls[0] as unknown) as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/payment_intents");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk_test_123",
      "Idempotency-Key": "intent_123"
    });
    const body = String(init.body);
    expect(body).toContain("amount=1700");
    expect(body).toContain("capture_method=manual");
    expect(body).toContain("payment_method_types%5B%5D=card");
    expect(body).toContain("metadata%5Bsession_id%5D=sess_123");
  });

  it("retrieves a PaymentIntent and maps Stripe status into the MCP contract", async () => {
    const provider = createStripeCompatiblePaymentProvider({
      secretKey: "sk_test_123"
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "pi_123",
          client_secret: "pi_123_secret_abc",
          latest_charge: "ch_123",
          status: "requires_capture",
          amount: 1700,
          amount_capturable: 1700,
          amount_received: 1700
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await provider.retrieveIntent.execute({
      provider: "stripe",
      action: "retrieve_payment_intent",
      version: "1",
      timeoutMs: 5000,
      context: {
        correlationId: "corr_123",
        restaurantId: "rest_demo",
        actor: {
          type: "system",
          id: "stripe_lookup"
        }
      },
      input: {
        restaurantId: "rest_demo",
        providerPaymentIntentId: "pi_123"
      }
    });

    expect(response.ok).toBe(true);
    expect(response.output).toEqual({
      providerPaymentIntentId: "pi_123",
      clientSecret: "pi_123_secret_abc",
      providerChargeId: "ch_123",
      status: "requires_capture",
      amountCents: 1700,
      capturableAmountCents: 1700,
      capturedAmountCents: 1700
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/payment_intents/pi_123",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("verifies and maps Stripe webhook events", () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "payment_intent.succeeded",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        object: {
          id: "pi_123",
          latest_charge: "ch_123"
        }
      }
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_123")
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex");

    const verified = verifyStripeWebhookSignature({
      payload,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      webhookSecret: "whsec_123"
    });

    expect(verified.ok).toBe(true);
    if (!verified.ok) {
      return;
    }

    expect(mapStripeWebhookEvent(verified.event)).toEqual({
      eventId: "evt_123",
      eventType: "payment_intent.succeeded",
      paymentIntentId: "pi_123",
      chargeId: "ch_123",
      internalState: "captured"
    });
  });
});
