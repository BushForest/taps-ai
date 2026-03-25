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

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return parseResponse<T>(response);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function resolveTap(tagCode: string): Promise<SessionSummaryResponse> {
  return apiPost<SessionSummaryResponse>(`/public/taps/${tagCode}/session`, {});
}

export function fetchGuestSummary(publicToken: string): Promise<GetSessionStatusResponse> {
  return apiGet<GetSessionStatusResponse>(`/public/sessions/${publicToken}/summary`);
}

export function fetchGuestStatus(publicToken: string): Promise<GetSessionStatusResponse> {
  return apiGet<GetSessionStatusResponse>(`/public/sessions/${publicToken}/status`);
}

export function fetchMenu(publicToken: string): Promise<MenuSnapshot> {
  return apiGet<MenuSnapshot>(`/public/sessions/${publicToken}/menu`);
}

export function fetchPublicRestaurantMenu(restaurantId: string): Promise<MenuSnapshot> {
  return apiGet<MenuSnapshot>(`/public/restaurants/${restaurantId}/menu`);
}

export function fetchCheck(publicToken: string): Promise<GetCheckResponse> {
  return apiGet<GetCheckResponse>(`/public/sessions/${publicToken}/check`);
}

export function createPayer(publicToken: string, payload: { displayName: string; phoneE164?: string }): Promise<Payer> {
  return apiPost<Payer>(`/public/sessions/${publicToken}/payers`, payload);
}

export function splitEvenly(publicToken: string, payload: { checkVersion: number }): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/even`, payload);
}

export function splitByItem(
  publicToken: string,
  payload: { payerId: string; checkVersion: number; lineItemIds: string[] }
): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/by-item`, payload);
}

export function splitCustomAmount(
  publicToken: string,
  payload: { payerId: string; checkVersion: number; amountCents: number }
): Promise<SubmitAllocationResponse> {
  return apiPost<SubmitAllocationResponse>(`/public/sessions/${publicToken}/allocations/custom`, payload);
}

export function createPaymentIntent(
  publicToken: string,
  payload: {
    payerId: string;
    allocationPlanId: string;
    checkVersion: number;
    amountCents: number;
    tipCents: number;
  }
): Promise<CreatePaymentIntentResponse> {
  return apiPost<CreatePaymentIntentResponse>(`/public/sessions/${publicToken}/payments/intents`, payload);
}

export function capturePayment(publicToken: string, paymentAttemptId: string) {
  return apiPost<{
    paymentAttempt: { id: string; status: string };
    session: { status: string };
    closeValidation?: { canClose: boolean; reasons: string[] };
    check: { remainingBalanceCents: number };
  }>(`/public/sessions/${publicToken}/payments/${paymentAttemptId}/capture`, {});
}

export function attachLoyalty(
  publicToken: string,
  payload: { payerId?: string; phoneNumber: string }
): Promise<AttachLoyaltyResponse> {
  return apiPost<AttachLoyaltyResponse>(`/public/sessions/${publicToken}/loyalty`, payload);
}
