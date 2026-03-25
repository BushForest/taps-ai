import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSquarePosProvider,
  mapSquareWebhookEvent,
  verifySquareWebhookSignature
} from "../../packages/mcp/src/providers/square-pos-provider";

describe("Square POS provider contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps a Square order into the normalized check snapshot shape", async () => {
    const provider = createSquarePosProvider({
      accessToken: "sqpat-sandbox-123",
      locationId: "location_123",
      environment: "sandbox"
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          orders: [
            {
              id: "order_123",
              version: 3,
              state: "OPEN",
              reference_id: "taps:sess_123",
              metadata: {
                taps_session_id: "sess_123",
                taps_table_id: "table_12"
              },
              total_money: { amount: 5400, currency: "USD" },
              total_tax_money: { amount: 400, currency: "USD" },
              total_service_charge_money: { amount: 0, currency: "USD" },
              total_discount_money: { amount: 0, currency: "USD" },
              net_amount_due_money: { amount: 5400, currency: "USD" },
              updated_at: "2026-03-23T15:00:00.000Z",
              line_items: [
                {
                  uid: "line_burger",
                  name: "Smash Burger",
                  quantity: "1",
                  total_money: { amount: 1944, currency: "USD" },
                  total_tax_money: { amount: 144, currency: "USD" },
                  modifiers: [
                    {
                      uid: "mod_cheddar",
                      name: "Add Cheddar",
                      quantity: "1",
                      total_price_money: { amount: 162, currency: "USD" }
                    }
                  ]
                },
                {
                  uid: "line_pitcher",
                  name: "House Margarita Pitcher",
                  quantity: "1",
                  total_money: { amount: 2376, currency: "USD" },
                  total_tax_money: { amount: 176, currency: "USD" }
                }
              ],
              service_charges: [
                {
                  uid: "fee_service",
                  name: "Patio service fee",
                  total_money: { amount: 918, currency: "USD" }
                }
              ]
            }
          ]
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

    const response = await provider.fetchCheck.execute({
      provider: "square",
      action: "fetch_check_from_pos",
      version: "1",
      timeoutMs: 5000,
      context: {
        correlationId: "corr_123",
        restaurantId: "rest_demo",
        actor: {
          type: "system",
          id: "test"
        }
      },
      input: {
        restaurantId: "rest_demo",
        tableId: "table_12",
        sessionId: "sess_123"
      }
    });

    expect(response.ok).toBe(true);
    expect(response.output?.posCheckId).toBe("order_123");
    expect(response.output?.totalCents).toBe(5400);
    expect(response.output?.remainingBalanceCents).toBe(5400);
    expect(response.output?.lines.map((line) => line.name)).toEqual([
      "Smash Burger",
      "Add Cheddar",
      "House Margarita Pitcher",
      "Patio service fee"
    ]);
  });

  it("verifies and maps Square webhook events", () => {
    const payload = JSON.stringify({
      event_id: "square_evt_123",
      type: "payment.updated",
      data: {
        id: "payment_123",
        type: "payment",
        object: {
          payment: {
            id: "payment_123",
            order_id: "order_123",
            status: "COMPLETED"
          }
        }
      }
    });
    const notificationUrl = "https://demo.taps.local/webhooks/square";
    const signature = createHmac("sha256", "square_secret_123")
      .update(notificationUrl + payload, "utf8")
      .digest("base64");

    const verified = verifySquareWebhookSignature({
      notificationUrl,
      payload,
      signatureHeader: signature,
      signatureKey: "square_secret_123"
    });

    expect(verified.ok).toBe(true);
    if (!verified.ok) {
      return;
    }

    expect(mapSquareWebhookEvent(verified.event)).toEqual({
      eventId: "square_evt_123",
      eventType: "payment.updated",
      orderId: "order_123",
      paymentId: "payment_123",
      internalState: "captured"
    });
  });
});
