import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CapturePaymentOutput,
  CreatePaymentIntentOutput,
  PaymentProviderContract,
  ProviderPaymentIntentStatus,
  RetrievePaymentIntentOutput
} from "@taps/contracts";
import { createMcpTool, errorResponse, okResponse } from "../runtime/mcp-tool";

const STRIPE_API_BASE_URL = "https://api.stripe.com";

export interface StripeCompatiblePaymentProviderConfig {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  apiVersion?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data: {
    object: Record<string, unknown>;
  };
}

export interface StripeWebhookMapping {
  eventId: string;
  eventType: string;
  paymentIntentId?: string;
  chargeId?: string;
  internalState: "captured" | "failed" | "refunded" | "processing" | "ignored";
}

function stripeConfigError(config: StripeCompatiblePaymentProviderConfig): string | undefined {
  if (!config.secretKey) {
    return "Stripe wiring requires STRIPE_SECRET_KEY.";
  }

  return undefined;
}

function stripeHeaders(config: StripeCompatiblePaymentProviderConfig, idempotencyKey?: string): HeadersInit {
  return {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    ...(config.apiVersion ? { "Stripe-Version": config.apiVersion } : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
  };
}

async function parseStripeResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function stripeRequest(
  config: StripeCompatiblePaymentProviderConfig,
  path: string,
  options: {
    method?: "POST" | "GET";
    body?: URLSearchParams;
    idempotencyKey?: string;
  }
): Promise<{
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
}> {
  if (!config.secretKey) {
    return {
      ok: false,
      status: 400,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: stripeConfigError(config),
      retryable: false
    };
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
      method: options.method ?? "POST",
      headers: stripeHeaders(config, options.idempotencyKey),
      ...(options.body ? { body: options.body.toString() } : {})
    });
    const data = await parseStripeResponse(response);

    if (!response.ok) {
      const error = (data.error ?? {}) as Record<string, unknown>;
      return {
        ok: false,
        status: response.status,
        data,
        errorCode: typeof error.code === "string" ? error.code : `STRIPE_HTTP_${response.status}`,
        errorMessage:
          typeof error.message === "string"
            ? error.message
            : `Stripe request to ${path} failed with HTTP ${response.status}.`,
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
      errorCode: "STRIPE_NETWORK_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown Stripe network error",
      retryable: true
    };
  }
}

function mapStripeIntentStatus(status: string | undefined): ProviderPaymentIntentStatus {
  switch (status) {
    case "requires_payment_method":
      return "requires_payment_method";
    case "requires_action":
      return "requires_action";
    case "processing":
      return "processing";
    case "requires_capture":
      return "requires_capture";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "canceled";
    default:
      return "requires_confirmation";
  }
}

function mapStripeCaptureStatus(status: string | undefined): CapturePaymentOutput["status"] {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "processing":
    case "requires_capture":
      return "processing";
    default:
      return "failed";
  }
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toSafeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function extractLastPaymentError(data: Record<string, unknown>): {
  lastErrorCode?: string;
  lastErrorMessage?: string;
} {
  const lastPaymentError =
    data.last_payment_error && typeof data.last_payment_error === "object"
      ? (data.last_payment_error as Record<string, unknown>)
      : undefined;

  return {
    lastErrorCode: toOptionalString(lastPaymentError?.code),
    lastErrorMessage: toOptionalString(lastPaymentError?.message)
  };
}

function mapRetrieveOutput(data: Record<string, unknown>): RetrievePaymentIntentOutput {
  return {
    providerPaymentIntentId: String(data.id),
    clientSecret: toOptionalString(data.client_secret),
    providerChargeId: toOptionalString(data.latest_charge),
    status: mapStripeIntentStatus(toOptionalString(data.status)),
    amountCents: toSafeInt(data.amount),
    capturableAmountCents: toSafeInt(data.amount_capturable),
    capturedAmountCents: toSafeInt(data.amount_received),
    ...extractLastPaymentError(data)
  };
}

function constantTimeHexCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhookSignature(input: {
  payload: string;
  signatureHeader?: string;
  webhookSecret?: string;
  toleranceSeconds?: number;
}): { ok: true; event: StripeWebhookEvent } | { ok: false; errorCode: string; errorMessage: string } {
  if (!input.webhookSecret) {
    return {
      ok: false,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: "STRIPE_WEBHOOK_SECRET is required to verify Stripe webhook signatures."
    };
  }

  if (!input.signatureHeader) {
    return {
      ok: false,
      errorCode: "MISSING_SIGNATURE",
      errorMessage: "Stripe-Signature header is missing."
    };
  }

  const parts = new Map(
    input.signatureHeader.split(",").map((segment) => {
      const [key, value] = segment.split("=", 2);
      return [key, value];
    })
  );
  const timestamp = Number(parts.get("t"));
  const signatures = input.signatureHeader
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.startsWith("v1="))
    .map((segment) => segment.slice(3));

  if (!Number.isFinite(timestamp) || !signatures.length) {
    return {
      ok: false,
      errorCode: "INVALID_SIGNATURE",
      errorMessage: "Stripe-Signature header format is invalid."
    };
  }

  const toleranceMs = (input.toleranceSeconds ?? 300) * 1000;
  if (Math.abs(Date.now() - timestamp * 1000) > toleranceMs) {
    return {
      ok: false,
      errorCode: "SIGNATURE_TIMESTAMP_OUT_OF_RANGE",
      errorMessage: "Stripe webhook signature timestamp is outside the allowed tolerance."
    };
  }

  const signedPayload = `${timestamp}.${input.payload}`;
  const expectedSignature = createHmac("sha256", input.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  if (!signatures.some((signature) => constantTimeHexCompare(signature, expectedSignature))) {
    return {
      ok: false,
      errorCode: "SIGNATURE_VERIFICATION_FAILED",
      errorMessage: "Stripe webhook signature verification failed."
    };
  }

  return {
    ok: true,
    event: JSON.parse(input.payload) as StripeWebhookEvent
  };
}

export function mapStripeWebhookEvent(event: StripeWebhookEvent): StripeWebhookMapping {
  const object = event.data.object ?? {};
  const paymentIntentId = typeof object.id === "string" && object.id.startsWith("pi_") ? object.id : undefined;
  const chargeId =
    typeof object.latest_charge === "string"
      ? object.latest_charge
      : typeof object.id === "string" && object.id.startsWith("ch_")
        ? object.id
        : undefined;

  switch (event.type) {
    case "payment_intent.succeeded":
    case "charge.succeeded":
      return {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        chargeId,
        internalState: "captured"
      };
    case "payment_intent.payment_failed":
    case "charge.failed":
      return {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        chargeId,
        internalState: "failed"
      };
    case "charge.refunded":
      return {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        chargeId,
        internalState: "refunded"
      };
    case "payment_intent.processing":
      return {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        chargeId,
        internalState: "processing"
      };
    default:
      return {
        eventId: event.id,
        eventType: event.type,
        paymentIntentId,
        chargeId,
        internalState: "ignored"
      };
  }
}

export function createStripeCompatiblePaymentProvider(
  config: StripeCompatiblePaymentProviderConfig = {}
): PaymentProviderContract {
  const configError = stripeConfigError(config);

  return {
    createIntent: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const params = new URLSearchParams();
      params.set("amount", String(request.input.amountCents + request.input.tipCents));
      params.set("currency", request.input.currency.toLowerCase());
      params.set("capture_method", "manual");
      params.append("payment_method_types[]", "card");
      params.set("metadata[restaurant_id]", request.input.restaurantId);
      params.set("metadata[session_id]", request.input.sessionId);
      params.set("metadata[payer_id]", request.input.payerId);

      const response = await stripeRequest(config, "/v1/payment_intents", {
        body: params,
        idempotencyKey: request.idempotencyKey
      });

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "STRIPE_CREATE_INTENT_FAILED",
          response.errorMessage ?? "Stripe PaymentIntent creation failed.",
          response.retryable
        );
      }

      return okResponse(
        request,
        {
          providerPaymentIntentId: String(response.data.id),
          clientSecret: toOptionalString(response.data.client_secret),
          status: mapStripeIntentStatus(toOptionalString(response.data.status))
        } satisfies CreatePaymentIntentOutput,
        {
          raw: response.data
        }
      );
    }),
    retrieveIntent: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const response = await stripeRequest(
        config,
        `/v1/payment_intents/${encodeURIComponent(request.input.providerPaymentIntentId)}`,
        {
          method: "GET"
        }
      );

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "STRIPE_RETRIEVE_INTENT_FAILED",
          response.errorMessage ?? "Stripe PaymentIntent lookup failed.",
          response.retryable
        );
      }

      return okResponse(request, mapRetrieveOutput(response.data), {
        raw: response.data
      });
    }),
    captureIntent: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const params = new URLSearchParams();
      params.set("amount_to_capture", String(request.input.amountCents));

      const response = await stripeRequest(
        config,
        `/v1/payment_intents/${encodeURIComponent(request.input.providerPaymentIntentId)}/capture`,
        {
          body: params,
          idempotencyKey: request.idempotencyKey
        }
      );

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "STRIPE_CAPTURE_FAILED",
          response.errorMessage ?? "Stripe capture failed.",
          response.retryable
        );
      }

      return okResponse(
        request,
        {
          providerChargeId:
            toOptionalString(response.data.latest_charge) ?? request.input.providerPaymentIntentId,
          status: mapStripeCaptureStatus(toOptionalString(response.data.status)),
          capturedAmountCents: request.input.amountCents
        },
        {
          raw: response.data
        }
      );
    }),
    refundCharge: createMcpTool(async (request) => {
      if (configError) {
        return errorResponse(request, "MISSING_PROVIDER_CONFIG", configError);
      }

      const params = new URLSearchParams();
      params.set("charge", request.input.providerChargeId);
      params.set("amount", String(request.input.amountCents));

      const response = await stripeRequest(config, "/v1/refunds", {
        body: params,
        idempotencyKey: request.idempotencyKey
      });

      if (!response.ok || !response.data) {
        return errorResponse(
          request,
          response.errorCode ?? "STRIPE_REFUND_FAILED",
          response.errorMessage ?? "Stripe refund failed.",
          response.retryable
        );
      }

      return okResponse(
        request,
        {
          refundId: String(response.data.id),
          status: response.data.status === "pending" ? "pending" : "succeeded"
        },
        {
          raw: response.data
        }
      );
    })
  };
}
