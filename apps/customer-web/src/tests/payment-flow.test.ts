import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, isApiError } from "../lib/api-client";

/**
 * NFC to payment flow smoke test.
 * Uses vi.stubGlobal("fetch") to mock API calls, covering:
 *   1. Session resolution (publicToken → session + check)
 *   2. Menu load
 *   3. Cart item add (pure client-side)
 *   4. Kitchen submit (order POST)
 *   5. Bill load (check snapshot)
 *   6. Pay intent creation
 */

const DEMO_TOKEN = "pub_demo_table_test";

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const mockSummary = {
  access: { publicAccessAllowed: true, session: { id: "sess_test", tableId: "table-test", status: "active" } },
  session: { id: "sess_test", tableId: "table-test", restaurantId: "rest_demo", status: "active" },
  payers: [],
  settlement: { tableComplete: false, remainingBalanceCents: 8500 },
  check: { id: "chk_test", version: 1, totalCents: 8500, subtotalCents: 7500, taxCents: 1000, remainingBalanceCents: 8500, lines: [], assignmentSummary: { completeness: "unassigned", unassignedLineItemIds: [], unassignedTinyItemIds: [] } },
};

const mockMenu = {
  categories: [{ id: "cat_mains", name: "Steaks & Mains", displayOrder: 1 }],
  items: [
    { id: "item_ribeye", name: "Dry Aged Ribeye", description: "12oz prime cut", basePriceCents: 6200, categoryId: "cat_mains", availability: "available", modifiers: [] },
    { id: "item_filet", name: "Filet Mignon", description: "8oz centre cut", basePriceCents: 7400, categoryId: "cat_mains", availability: "available", modifiers: [] },
  ],
};

const mockCheck = {
  id: "chk_test",
  version: 1,
  totalCents: 8500,
  subtotalCents: 7500,
  taxCents: 1000,
  feeCents: 0,
  amountPaidCents: 0,
  remainingBalanceCents: 8500,
  lines: [
    { id: "line_1", name: "Dry Aged Ribeye", grossCents: 6200, assignedCents: 0, assignmentStatus: "unassigned", isTinyCharge: false, parentId: null },
  ],
  assignmentSummary: { completeness: "unassigned", unassignedLineItemIds: ["line_1"], unassignedTinyItemIds: [] },
};

const mockPayer = { id: "payer_test", sessionId: "sess_test", displayName: "Alex", status: "active" };

const mockOrderResponse = {
  orderId: "ord_test",
  status: "submitted",
  lines: [{ menuItemId: "item_ribeye", quantity: 1 }],
};

const mockAllocationPlan = {
  id: "plan_test",
  entries: [{ id: "entry_1", payerId: "payer_test", assignedCents: 8500, lineItemIds: ["line_1"] }],
  splitType: "custom",
  totalCents: 8500,
};

const mockIntentResponse = {
  paymentAttempt: { id: "pay_test", status: "intent_created", amountCents: 8500 },
  clientSecret: "pi_test_secret_abc",
};

describe("NFC to payment smoke test", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves session summary from public token", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(mockSummary));

    const { fetchGuestSummary } = await import("../lib/api-client");
    const summary = await fetchGuestSummary(DEMO_TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/public/sessions/${DEMO_TOKEN}/summary`);
    expect(summary.access.publicAccessAllowed).toBe(true);
    expect(summary.session?.restaurantId).toBe("rest_demo");
  });

  it("loads menu items by restaurant", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(mockMenu));

    const { fetchPublicRestaurantMenu } = await import("../lib/api-client");
    const menu = await fetchPublicRestaurantMenu("rest_demo");

    expect(menu.items).toHaveLength(2);
    expect(menu.items[0]?.name).toBe("Dry Aged Ribeye");
    expect(menu.categories[0]?.name).toBe("Steaks & Mains");
  });

  it("submits order to kitchen", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(mockOrderResponse));

    const { apiPost } = await import("../lib/api-client");
    const result = await apiPost(`/public/sessions/${DEMO_TOKEN}/order`, {
      lines: [{ menuItemId: "item_ribeye", quantity: 1, modifiers: [], notes: "" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/order");
    expect((result as typeof mockOrderResponse).status).toBe("submitted");
  });

  it("loads bill / check snapshot", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ snapshot: mockCheck }));

    const { fetchCheck } = await import("../lib/api-client");
    const check = await fetchCheck(DEMO_TOKEN);

    expect(check.snapshot.remainingBalanceCents).toBe(8500);
    expect(check.snapshot.lines).toHaveLength(1);
    expect(check.snapshot.lines[0]?.name).toBe("Dry Aged Ribeye");
  });

  it("creates payment intent via split custom amount", async () => {
    // 1. create payer
    fetchMock.mockResolvedValueOnce(makeResponse(mockPayer));
    // 2. split custom
    fetchMock.mockResolvedValueOnce(makeResponse({ allocationPlan: mockAllocationPlan, check: mockCheck }));
    // 3. create intent
    fetchMock.mockResolvedValueOnce(makeResponse(mockIntentResponse));

    const { createPayer, splitCustomAmount, createPaymentIntent } = await import("../lib/api-client");

    const payer = await createPayer(DEMO_TOKEN, { displayName: "Alex" });
    expect(payer.id).toBe("payer_test");

    const allocation = await splitCustomAmount(DEMO_TOKEN, {
      payerId: payer.id,
      checkVersion: 1,
      amountCents: 8500,
    });
    expect(allocation.allocationPlan.id).toBe("plan_test");

    const intent = await createPaymentIntent(DEMO_TOKEN, {
      payerId: payer.id,
      allocationPlanId: allocation.allocationPlan.id,
      checkVersion: 1,
      amountCents: 8500,
      tipCents: 0,
    });
    expect(intent.paymentAttempt.status).toBe("intent_created");
    expect(intent.clientSecret).toBeTruthy();
  });

  it("isApiError correctly identifies API errors", () => {
    const apiErr = new ApiError("Not found", "NOT_FOUND", 404);
    const normalErr = new Error("Normal error");

    expect(isApiError(apiErr)).toBe(true);
    expect(isApiError(normalErr)).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(apiErr.code).toBe("NOT_FOUND");
    expect(apiErr.status).toBe(404);
  });
});
