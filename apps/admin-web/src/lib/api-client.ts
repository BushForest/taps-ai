import type {
  AdminExceptionSummary,
  AdminRestaurantOverviewResponse,
  AdminSessionDetailResponse,
  AdminSessionSummary,
  AdminTableSummary,
  MenuSnapshot
} from "@taps/contracts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
    ...extra,
  };
}

function traceHeaders(traceId?: string): Record<string, string> {
  return traceId ? { "x-trace-id": traceId } : {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return new ApiError(payload.message ?? `Request failed with ${response.status}`, response.status, payload.error);
  } catch {
    return new ApiError(`Request failed with ${response.status}`, response.status);
  }
}

export async function adminGet<T>(path: string, traceId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: adminHeaders(traceHeaders(traceId)),
  });
  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body?: unknown, traceId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: adminHeaders({ "content-type": "application/json", ...traceHeaders(traceId) }),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}

export async function adminDelete(path: string, traceId?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: adminHeaders(traceHeaders(traceId)),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
}

export function fetchRestaurantOverview(restaurantId: string, traceId?: string) {
  return adminGet<AdminRestaurantOverviewResponse>(`/admin/restaurants/${restaurantId}/overview`, traceId);
}

export function fetchRestaurantSessions(restaurantId: string, traceId?: string) {
  return adminGet<AdminSessionSummary[]>(`/admin/restaurants/${restaurantId}/sessions`, traceId);
}

export function fetchRestaurantTables(restaurantId: string, traceId?: string) {
  return adminGet<{ restaurantId: string; tables: AdminTableSummary[] }>(`/admin/restaurants/${restaurantId}/tables`, traceId);
}

export function fetchRestaurantExceptions(restaurantId: string, traceId?: string) {
  return adminGet<{ restaurantId: string; exceptions: AdminExceptionSummary[] }>(
    `/admin/restaurants/${restaurantId}/exceptions`,
    traceId
  );
}

export function fetchSessionDetail(restaurantId: string, sessionId: string, traceId?: string) {
  return adminGet<AdminSessionDetailResponse>(`/admin/restaurants/${restaurantId}/sessions/${sessionId}`, traceId);
}

export function clearSession(sessionId: string, traceId?: string) {
  return adminPost<{ ok: true }>(`/admin/sessions/${sessionId}/clear`, undefined, traceId);
}

export function closeSession(sessionId: string, traceId?: string) {
  return adminPost<{ ok?: true; session?: { id: string } }>(`/admin/sessions/${sessionId}/close`, undefined, traceId);
}

export function resolveException(exceptionId: string, traceId?: string) {
  return adminPost<{ ok: true }>(`/admin/exceptions/${exceptionId}/resolve`, undefined, traceId);
}

export function fetchRestaurantMenu(restaurantId: string, traceId?: string) {
  return adminGet<MenuSnapshot>(`/public/restaurants/${restaurantId}/menu`, traceId);
}

export function addSessionItem(
  sessionId: string,
  payload: { menuItemId: string; quantity?: number },
  traceId?: string
) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(`/admin/sessions/${sessionId}/items`, payload, traceId);
}

export function applySessionCredit(
  sessionId: string,
  payload: { amountCents: number; label?: string },
  traceId?: string
) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(`/admin/sessions/${sessionId}/credits`, payload, traceId);
}

export function voidSessionLine(
  sessionId: string,
  lineId: string,
  payload?: { reason?: string },
  traceId?: string
) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(
    `/admin/sessions/${sessionId}/lines/${lineId}/void`,
    payload ?? {},
    traceId
  );
}

export function clearAssistRequest(restaurantId: string, sessionId: string, traceId?: string): Promise<void> {
  return adminDelete(`/admin/restaurants/${restaurantId}/sessions/${sessionId}/assist`, traceId);
}

export function fetchRestaurantFlags(restaurantId: string, traceId?: string) {
  return adminGet<{ flags: Record<string, boolean> }>(`/admin/restaurants/${restaurantId}/flags`, traceId);
}

export function updateRestaurantFlags(
  restaurantId: string,
  flags: Record<string, boolean>,
  traceId?: string
) {
  return adminPost<{ ok: true; flags: Record<string, boolean> }>(
    `/admin/restaurants/${restaurantId}/flags`,
    { flags },
    traceId
  );
}
