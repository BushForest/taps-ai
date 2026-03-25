import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { CheckLineItem, CheckSnapshot, MenuItem, MenuModifierGroup, MenuSnapshot, PosProviderContract } from "@taps/contracts";
import { createMcpTool, errorResponse, okResponse } from "../runtime/mcp-tool";

export interface SquarePosProviderConfig {
  accessToken?: string;
  locationId?: string;
  environment?: "sandbox" | "production";
  webhookSignatureKey?: string;
  apiVersion?: string;
}

export interface SquareWebhookEvent {
  merchant_id?: string;
  type: string;
  event_id?: string;
  created_at?: string;
  data?: {
    id?: string;
    type?: string;
    object?: {
      payment?: Record<string, unknown>;
      order?: Record<string, unknown>;
    };
  };
}

export interface SquareWebhookMapping {
  eventId?: string;
  eventType: string;
  orderId?: string;
  paymentId?: string;
  internalState: "captured" | "failed" | "processing" | "order_changed" | "ignored";
}

const SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com";
const SQUARE_PRODUCTION_BASE_URL = "https://connect.squareup.com";

function squareConfigError(config: SquarePosProviderConfig): string | undefined {
  if (!config.accessToken || !config.locationId) {
    return "Square wiring requires SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.";
  }

  return undefined;
}

function squareBaseUrl(config: SquarePosProviderConfig): string {
  return config.environment === "production" ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL;
}

function squareHeaders(config: SquarePosProviderConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    ...(config.apiVersion ? { "Square-Version": config.apiVersion } : {})
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function moneyAmount(value: unknown): number {
  return numberValue(asRecord(value).amount) ?? 0;
}

function quantityValue(value: unknown): number {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 1;
}

function buildAssignmentSummary(lines: CheckLineItem[], remainingBalanceCents: number): CheckSnapshot["assignmentSummary"] {
  const unassignedLineItemIds = lines.map((line) => line.id);
  const unassignedTinyItemIds = lines.filter((line) => line.isTinyCharge).map((line) => line.id);
  const unassignedLineCents = lines.reduce((sum, line) => sum + line.grossCents, 0);

  return {
    completeness: lines.length ? "unassigned" : "fully_assigned",
    assignedLineCents: 0,
    unassignedLineCents,
    outstandingBalanceCents: remainingBalanceCents,
    unassignedLineItemIds,
    unassignedTinyItemIds
  };
}

async function squareRequest(
  config: SquarePosProviderConfig,
  path: string,
  options?: { method?: "GET" | "POST"; body?: Record<string, unknown> }
): Promise<{
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
}> {
  const configError = squareConfigError(config);
  if (configError) {
    return {
      ok: false,
      status: 400,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: configError,
      retryable: false
    };
  }

  try {
    const response = await fetch(`${squareBaseUrl(config)}${path}`, {
      method: options?.method ?? "POST",
      headers: squareHeaders(config),
      body: options?.body ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (!response.ok) {
      const errors = Array.isArray(data.errors) ? data.errors.map(asRecord) : [];
      return {
        ok: false,
        status: response.status,
        data,
        errorCode:
          stringValue(errors[0]?.code) ??
          `SQUARE_HTTP_${response.status}`,
        errorMessage:
          stringValue(errors[0]?.detail) ??
          stringValue(errors[0]?.category) ??
          `Square request to ${path} failed with HTTP ${response.status}.`,
        retryable: response.status >= 500
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      retryable: false
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      errorCode: "SQUARE_NETWORK_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown Square network error",
      retryable: true
    };
  }
}

function buildMenuFromCatalog(restaurantId: string, objects: Record<string, unknown>[]): MenuSnapshot {
  const categories = objects.filter((object) => stringValue(object.type) === "CATEGORY");
  const modifierLists = new Map(
    objects
      .filter((object) => stringValue(object.type) === "MODIFIER_LIST")
      .map((object) => [String(object.id), object])
  );
  const modifiersByListId = new Map<string, Record<string, unknown>[]>();
  for (const modifier of objects.filter((object) => stringValue(object.type) === "MODIFIER")) {
    const modifierData = asRecord(modifier.modifier_data);
    const listId = stringValue(modifierData.modifier_list_id);
    if (!listId) {
      continue;
    }

    const existing = modifiersByListId.get(listId) ?? [];
    existing.push(modifier);
    modifiersByListId.set(listId, existing);
  }
  const items = objects.filter((object) => stringValue(object.type) === "ITEM");

  const normalizedItems: MenuItem[] = items.map((object, index) => {
    const itemData = asRecord(object.item_data);
    const variations = asArray(itemData.variations);
    const defaultVariation = variations[0] ? asRecord(variations[0].item_variation_data) : {};
    const modifierGroups: MenuModifierGroup[] = asArray(itemData.modifier_list_info).map((info) => {
      const modifierList = modifierLists.get(String(info.modifier_list_id));
      const modifierListData = asRecord(modifierList?.modifier_list_data);
      const explicitModifiers = modifiersByListId.get(String(info.modifier_list_id)) ?? [];
      return {
        id: String(info.modifier_list_id),
        name: stringValue(modifierListData.name) ?? "Modifiers",
        minSelections: numberValue(info.min_selected_modifiers) ?? 0,
        maxSelections: numberValue(info.max_selected_modifiers) ?? 1,
        options: (explicitModifiers.length ? explicitModifiers : asArray(modifierListData.modifiers)).map((modifier) => {
          const modifierData = asRecord(modifier.modifier_data);
          return {
            id: String(modifier.id),
            name: stringValue(modifierData.name) ?? "Modifier",
            priceDeltaCents: moneyAmount(modifierData.price_money),
            availability: "available" as const
          };
        })
      };
    });

    return {
      id: String(object.id ?? `square_item_${index}`),
      categoryId: stringValue(itemData.category_id) ?? "uncategorized",
      name: stringValue(itemData.name) ?? "Unnamed item",
      description: stringValue(itemData.description),
      basePriceCents: moneyAmount(defaultVariation.price_money),
      currency: "USD",
      availability: object.is_deleted ? "hidden" : "available",
      modifiers: modifierGroups,
      addOns: []
    };
  });

  const normalizedCategories = categories.map((object, index) => ({
    id: String(object.id),
    name: stringValue(asRecord(object.category_data).name) ?? `Category ${index + 1}`,
    sortOrder: index + 1
  }));

  if (!normalizedCategories.length) {
    normalizedCategories.push({
      id: "uncategorized",
      name: "Menu",
      sortOrder: 1
    });
  }

  const nowIso = new Date().toISOString();
  return {
    id: `square_menu_${restaurantId}`,
    restaurantId,
    source: "pos",
    sourceVersion: nowIso,
    currency: "USD",
    categories: normalizedCategories,
    items: normalizedItems.map((item) => ({
      ...item,
      categoryId:
        normalizedCategories.find((category) => category.id === item.categoryId)?.id ?? normalizedCategories[0]!.id
    })),
    fetchedAt: nowIso,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function buildLineItemsFromSquareOrder(order: Record<string, unknown>): CheckLineItem[] {
  const orderState = stringValue(order.state) ?? "OPEN";
  const lineItems = asArray(order.line_items);
  const serviceCharges = asArray(order.service_charges);
  const normalized: CheckLineItem[] = [];

  for (const lineItem of lineItems) {
      const lineId = String(lineItem.uid ?? lineItem.catalog_object_id ?? randomUUID());
    const lineTax = moneyAmount(lineItem.total_tax_money);
    const lineTotal = moneyAmount(lineItem.total_money);
    const baseAmount = lineTotal > 0 ? Math.max(lineTotal - lineTax, 0) : moneyAmount(lineItem.base_price_money) * quantityValue(lineItem.quantity);

    normalized.push({
      id: lineId,
      posLineId: String(lineItem.uid ?? lineId),
      kind: "item",
      name: stringValue(lineItem.name) ?? "Item",
      quantity: quantityValue(lineItem.quantity),
      unitPriceCents: Math.max(Math.round(baseAmount / Math.max(quantityValue(lineItem.quantity), 1)), 0),
      extendedPriceCents: baseAmount,
      status: orderState === "COMPLETED" ? "paid" : "open",
      isStandalone: true,
      isModifier: false,
      taxCents: lineTax,
      feeCents: 0,
      grossCents: baseAmount + lineTax,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: baseAmount + lineTax <= 250
    });

    for (const modifier of asArray(lineItem.modifiers)) {
      const modifierBase = moneyAmount(modifier.total_price_money) || moneyAmount(modifier.base_price_money);
      const modifierId = String(modifier.uid ?? `${lineId}_mod_${normalized.length}`);
      normalized.push({
        id: modifierId,
        posLineId: String(modifier.uid ?? modifierId),
        parentLineId: lineId,
        kind: "modifier",
        name: stringValue(modifier.name) ?? "Modifier",
        quantity: quantityValue(modifier.quantity),
        unitPriceCents: Math.max(
          Math.round(modifierBase / Math.max(quantityValue(modifier.quantity), 1)),
          0
        ),
        extendedPriceCents: modifierBase,
        status: orderState === "COMPLETED" ? "paid" : "open",
        isStandalone: false,
        isModifier: true,
        modifierGroup: stringValue(modifier.catalog_object_id) ?? "Modifier",
        taxCents: 0,
        feeCents: 0,
        grossCents: modifierBase,
        assignedCents: 0,
        childLineIds: [],
        assignmentStatus: "unassigned",
        isTinyCharge: modifierBase <= 250
      });
    }
  }

  for (const serviceCharge of serviceCharges) {
    const amount = moneyAmount(serviceCharge.total_money) || moneyAmount(serviceCharge.applied_money);
    const feeId = String(serviceCharge.uid ?? `fee_${normalized.length}`);
    normalized.push({
      id: feeId,
      posLineId: String(serviceCharge.uid ?? feeId),
      kind: "fee",
      name: stringValue(serviceCharge.name) ?? "Service charge",
      quantity: 1,
      unitPriceCents: amount,
      extendedPriceCents: amount,
      status: orderState === "COMPLETED" ? "paid" : "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 0,
      feeCents: 0,
      grossCents: amount,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: amount <= 250
    });
  }

  return normalized;
}

function buildCheckFromSquareOrder(
  restaurantId: string,
  sessionId: string,
  order: Record<string, unknown>
): CheckSnapshot {
  const lines = buildLineItemsFromSquareOrder(order);
  const totalCents = moneyAmount(order.total_money);
  const remainingBalanceCents = moneyAmount(order.net_amount_due_money);
  const amountPaidCents = Math.max(totalCents - remainingBalanceCents, 0);
  const status = (() => {
    const orderState = stringValue(order.state);
    if (orderState === "COMPLETED" || remainingBalanceCents === 0) {
      return "closed" as const;
    }
    if (orderState === "CANCELED") {
      return "voided" as const;
    }
    if (amountPaidCents > 0) {
      return "partially_paid" as const;
    }
    return "open" as const;
  })();
  const nowIso = new Date().toISOString();

  return {
    id: `square_check_${String(order.id)}`,
    restaurantId,
    sessionId,
    posCheckId: String(order.id),
    sourceSystem: "square",
    sourceCheckVersion: String(order.version ?? order.updated_at ?? nowIso),
    status,
    currency: "USD",
    subtotalCents: moneyAmount(order.total_money) - moneyAmount(order.total_tax_money) - moneyAmount(order.total_service_charge_money),
    taxCents: moneyAmount(order.total_tax_money),
    feeCents: moneyAmount(order.total_service_charge_money),
    discountCents: moneyAmount(order.total_discount_money),
    totalCents,
    amountPaidCents,
    remainingBalanceCents,
    assignmentSummary: buildAssignmentSummary(lines, remainingBalanceCents),
    sourceUpdatedAt: stringValue(order.updated_at) ?? nowIso,
    closedAt: status === "closed" ? stringValue(order.closed_at) ?? nowIso : undefined,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    lines
  };
}

async function findSquareOrder(
  config: SquarePosProviderConfig,
  input: { restaurantId: string; tableId: string; sessionId: string; posCheckId?: string }
): Promise<Record<string, unknown> | null> {
  if (input.posCheckId) {
    const retrieve = await squareRequest(config, `/v2/orders/${encodeURIComponent(input.posCheckId)}`, {
      method: "GET"
    });
    if (!retrieve.ok || !retrieve.data) {
      return null;
    }

    return asRecord(retrieve.data.order);
  }

  const search = await squareRequest(config, "/v2/orders/search", {
    body: {
      location_ids: [config.locationId],
      query: {
        filter: {
          state_filter: {
            states: ["OPEN", "COMPLETED"]
          }
        },
        sort: {
          sort_field: "UPDATED_AT",
          sort_order: "DESC"
        }
      }
    }
  });

  if (!search.ok || !search.data) {
    return null;
  }

  const orders = asArray(search.data.orders);
  return (
    orders.find((order) => {
      const metadata = asRecord(order.metadata);
      return (
        stringValue(metadata.taps_session_id) === input.sessionId ||
        stringValue(metadata.taps_table_id) === input.tableId ||
        stringValue(order.reference_id) === `taps:${input.sessionId}`
      );
    }) ?? null
  );
}

function constantTimeBase64Compare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "base64");
  const rightBuffer = Buffer.from(right, "base64");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifySquareWebhookSignature(input: {
  notificationUrl: string;
  payload: string;
  signatureHeader?: string;
  signatureKey?: string;
}): { ok: true; event: SquareWebhookEvent } | { ok: false; errorCode: string; errorMessage: string } {
  if (!input.signatureKey) {
    return {
      ok: false,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: "SQUARE_WEBHOOK_SIGNATURE_KEY is required to verify Square webhook signatures."
    };
  }

  if (!input.signatureHeader) {
    return {
      ok: false,
      errorCode: "MISSING_SIGNATURE",
      errorMessage: "x-square-hmacsha256-signature header is missing."
    };
  }

  const expected = createHmac("sha256", input.signatureKey)
    .update(input.notificationUrl + input.payload, "utf8")
    .digest("base64");

  if (!constantTimeBase64Compare(input.signatureHeader, expected)) {
    return {
      ok: false,
      errorCode: "SIGNATURE_VERIFICATION_FAILED",
      errorMessage: "Square webhook signature verification failed."
    };
  }

  return {
    ok: true,
    event: JSON.parse(input.payload) as SquareWebhookEvent
  };
}

export function mapSquareWebhookEvent(event: SquareWebhookEvent): SquareWebhookMapping {
  const payment = asRecord(event.data?.object?.payment);
  const order = asRecord(event.data?.object?.order);

  switch (event.type) {
    case "payment.created":
    case "payment.updated":
      return {
        eventId: event.event_id,
        eventType: event.type,
        orderId: stringValue(payment.order_id),
        paymentId: stringValue(payment.id) ?? stringValue(event.data?.id),
        internalState:
          stringValue(payment.status) === "FAILED"
            ? "failed"
            : stringValue(payment.status) === "COMPLETED"
              ? "captured"
              : "processing"
      };
    case "order.updated":
    case "order.created":
      return {
        eventId: event.event_id,
        eventType: event.type,
        orderId: stringValue(order.id) ?? stringValue(event.data?.id),
        internalState: "order_changed"
      };
    default:
      return {
        eventId: event.event_id,
        eventType: event.type,
        internalState: "ignored"
      };
  }
}

export function createSquarePosProvider(config: SquarePosProviderConfig = {}): PosProviderContract {
  const configError = squareConfigError(config);

  return {
    fetchMenu: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const response = await squareRequest(config, "/v2/catalog/list?types=CATEGORY,ITEM,MODIFIER_LIST,MODIFIER", {
        method: "GET"
      });

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "SQUARE_MENU_FETCH_FAILED",
          response.errorMessage ?? "Unable to fetch Square catalog.",
          response.retryable
        );
      }

      return okResponse(
        request,
        buildMenuFromCatalog(request.input.restaurantId, asArray(response.data.objects)),
        {
          raw: response.data
        }
      );
    }),
    fetchCheck: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const order = await findSquareOrder(config, request.input);
      if (!order) {
        return okResponse(request, null);
      }

      return okResponse(
        request,
        buildCheckFromSquareOrder(request.input.restaurantId, request.input.sessionId, order),
        {
          raw: order
        }
      );
    }),
    createOrder: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const response = await squareRequest(config, "/v2/orders", {
        body: {
          idempotency_key: request.idempotencyKey ?? `taps_order_${request.input.sessionId}`,
          order: {
            location_id: config.locationId,
            reference_id: `taps:${request.input.sessionId}`,
            metadata: {
              taps_restaurant_id: request.input.restaurantId,
              taps_table_id: request.input.tableId,
              taps_session_id: request.input.sessionId
            }
          }
        }
      });

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "SQUARE_CREATE_ORDER_FAILED",
          response.errorMessage ?? "Unable to create Square order.",
          response.retryable
        );
      }

      return okResponse(
        request,
        {
          posCheckId: String(asRecord(response.data.order).id)
        },
        {
          raw: response.data
        }
      );
    }),
    attachPayment: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      if ((request.input.tipAmount?.amountCents ?? 0) > 0) {
        return errorResponse(
          request,
          "SQUARE_TIP_SERVICE_CHARGE_REQUIRED",
          "Square external payment writeback currently supports zero-tip flows only. Map tips to Square service charges before attaching sandbox payments."
        );
      }

      const orderResponse = await squareRequest(config, `/v2/orders/${encodeURIComponent(request.input.posCheckId)}`, {
        method: "GET"
      });
      if (!orderResponse.ok || !orderResponse.data) {
        return errorResponse(
          request,
          orderResponse.errorCode ?? "SQUARE_ORDER_LOOKUP_FAILED",
          orderResponse.errorMessage ?? "Unable to retrieve Square order before payment attach.",
          orderResponse.retryable
        );
      }

      const order = asRecord(orderResponse.data.order);
      const paymentResponse = await squareRequest(config, "/v2/payments", {
        body: {
          idempotency_key: request.idempotencyKey ?? `taps_payment_${request.input.paymentAttemptId}`,
          source_id: "EXTERNAL",
          amount_money: {
            amount: request.input.amount.amountCents,
            currency: request.input.amount.currency
          },
          order_id: request.input.posCheckId,
          autocomplete: false,
          location_id: config.locationId,
          external_details: {
            type: "OTHER",
            source: "Taps Stripe"
          },
          note: `Taps payment ${request.input.paymentAttemptId}`
        }
      });

      if (!paymentResponse.ok || !paymentResponse.data) {
        return errorResponse(
          request,
          paymentResponse.errorCode ?? "SQUARE_CREATE_PAYMENT_FAILED",
          paymentResponse.errorMessage ?? "Unable to create Square external payment.",
          paymentResponse.retryable
        );
      }

      const payment = asRecord(paymentResponse.data.payment);
      const paymentId = stringValue(payment.id);
      if (!paymentId) {
        return errorResponse(request, "SQUARE_PAYMENT_ID_MISSING", "Square payment response did not include a payment ID.");
      }

      const payOrderResponse = await squareRequest(config, `/v2/orders/${encodeURIComponent(request.input.posCheckId)}/pay`, {
        body: {
          idempotency_key: `${request.idempotencyKey ?? `taps_pay_order_${request.input.paymentAttemptId}`}:pay`,
          order_version: numberValue(order.version),
          payment_ids: [paymentId]
        }
      });

      if (!payOrderResponse.ok) {
        return errorResponse(
          request,
          payOrderResponse.errorCode ?? "SQUARE_PAY_ORDER_FAILED",
          payOrderResponse.errorMessage ?? "Unable to complete Square pay-order flow.",
          payOrderResponse.retryable
        );
      }

      return okResponse(
        request,
        {
          posPaymentId: paymentId,
          attachedAmountCents: request.input.amount.amountCents
        },
        {
          raw: {
            payment: paymentResponse.data,
            payOrder: payOrderResponse.data
          }
        }
      );
    }),
    fetchTableStatus: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const order = await findSquareOrder(config, {
        restaurantId: request.input.restaurantId,
        tableId: request.input.tableId,
        sessionId: `table_lookup_${request.input.tableId}`
      });

      if (!order) {
        return okResponse(request, { state: "open" });
      }

      const state = stringValue(order.state);
      return okResponse(request, {
        state: state === "COMPLETED" ? "closed" : "occupied",
        posCheckId: stringValue(order.id)
      });
    }),
    detectClosedCheck: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const order = await findSquareOrder(config, request.input);
      const state = stringValue(order?.state);
      return okResponse(request, {
        isClosed: !order || state === "COMPLETED" || state === "CANCELED",
        posCheckId: stringValue(order?.id),
        closedAt: state === "COMPLETED" ? stringValue(order?.closed_at) ?? stringValue(order?.updated_at) : undefined
      });
    }),
    syncVoidsAndCancels: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const order = await findSquareOrder(config, request.input);
      if (!order) {
        return okResponse(request, {
          check: null,
          changedLineIds: []
        });
      }

      const check = buildCheckFromSquareOrder(request.input.restaurantId, request.input.sessionId, order);
      const changedLineIds = check.lines
        .filter((line) => line.status === "voided" || line.status === "cancelled")
        .map((line) => line.id);

      return okResponse(
        request,
        {
          check,
          changedLineIds,
          sourceCheckVersion: check.sourceCheckVersion
        },
        {
          raw: order
        }
      );
    })
  };
}
