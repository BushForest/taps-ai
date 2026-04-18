import type {
  AttachLoyaltyResponse,
  CreatePaymentIntentResponse,
  GetCheckResponse,
  GetSessionStatusResponse,
  MenuSnapshot,
  Payer,
  SessionSummaryResponse,
  SubmitAllocationResponse
} from "@taps/contracts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiError(
      typeof payload.message === "string" ? payload.message : `Request failed with ${response.status}`,
      typeof payload.error === "string" ? payload.error : "REQUEST_FAILED",
      response.status
    );
  }

  return payload as T;
}

function traceHeaders(traceId?: string): Record<string, string> {
  return traceId ? { "x-trace-id": traceId } : {};
}

export async function apiGet<T>(path: string, traceId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: traceHeaders(traceId),
  });
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown, traceId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...traceHeaders(traceId),
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return parseResponse<T>(response);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function resolveTap(tagCode: string, traceId?: string): Promise<SessionSummaryResponse> {
  return apiPost<SessionSummaryResponse>(`/public/taps/${tagCode}/session`, {}, traceId);
}

export function fetchGuestSummary(publicToken: string, traceId?: string): Promise<GetSessionStatusResponse> {
  return apiGet<GetSessionStatusResponse>(`/public/sessions/${publicToken}/summary`, traceId);
}

export function fetchGuestStatus(publicToken: string, traceId?: string): Promise<GetSessionStatusResponse> {
  return apiGet<GetSessionStatusResponse>(`/public/sessions/${publicToken}/status`, traceId);
}

export function fetchMenu(publicToken: string, traceId?: string): Promise<MenuSnapshot> {
  return apiGet<MenuSnapshot>(`/public/sessions/${publicToken}/menu`, traceId);
}

export function fetchPublicRestaurantMenu(restaurantId: string, traceId?: string): Promise<MenuSnapshot> {
  return apiGet<MenuSnapshot>(`/public/restaurants/${restaurantId}/menu`, traceId);
}

export function fetchCheck(publicToken: string, traceId?: string): Promise<GetCheckResponse> {
  return apiGet<GetCheckResponse>(`/public/sessions/${publicToken}/check`, traceId);
}

export function createPayer(
  publicToken: string,
  payload: { displayName: string; phoneE164?: string },
  traceId?: string
): Promise<Payer> {
  return apiPost<Payer>(`/public/sessions/${publicToken}/payers`, payload, traceId);
}

export function splitEvenly(
  publicToken: string,
  payload: { checkVersion: number },
  traceId?: string
): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/even`, payload, traceId);
}

export function splitByItem(
  publicToken: string,
  payload: { payerId: string; checkVersion: number; lineItemIds: string[] },
  traceId?: string
): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/by-item`, payload, traceId);
}

export function splitCustomAmount(
  publicToken: string,
  payload: { payerId: string; checkVersion: number; amountCents: number },
  traceId?: string
): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/custom`, payload, traceId);
}

export function createPaymentIntent(
  publicToken: string,
  payload: {
    payerId: string;
    allocationPlanId: string;
    checkVersion: number;
    amountCents: number;
    tipCents: number;
  },
  traceId?: string
): Promise<CreatePaymentIntentResponse> {
  return apiPost<CreatePaymentIntentResponse>(`/public/sessions/${publicToken}/payments/intents`, payload, traceId);
}

export function capturePayment(publicToken: string, paymentAttemptId: string, traceId?: string) {
  return apiPost<{
    paymentAttempt: { id: string; status: string };
    session: { status: string };
    closeValidation?: { canClose: boolean; reasons: string[] };
    check: { remainingBalanceCents: number };
  }>(`/public/sessions/${publicToken}/payments/${paymentAttemptId}/capture`, {}, traceId);
}

export function attachLoyalty(
  publicToken: string,
  payload: { payerId?: string; phoneNumber: string },
  traceId?: string
): Promise<AttachLoyaltyResponse> {
  return apiPost<AttachLoyaltyResponse>(`/public/sessions/${publicToken}/loyalty`, payload, traceId);
}
