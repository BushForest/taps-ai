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

export async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: adminHeaders(),
  });
  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}

export async function adminDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
}

export function fetchRestaurantOverview(restaurantId: string) {
  return adminGet<AdminRestaurantOverviewResponse>(`/admin/restaurants/${restaurantId}/overview`);
}

export function fetchRestaurantSessions(restaurantId: string) {
  return adminGet<AdminSessionSummary[]>(`/admin/restaurants/${restaurantId}/sessions`);
}

export function fetchRestaurantTables(restaurantId: string) {
  return adminGet<{ restaurantId: string; tables: AdminTableSummary[] }>(`/admin/restaurants/${restaurantId}/tables`);
}

export function fetchRestaurantExceptions(restaurantId: string) {
  return adminGet<{ restaurantId: string; exceptions: AdminExceptionSummary[] }>(
    `/admin/restaurants/${restaurantId}/exceptions`
  );
}

export function fetchSessionDetail(restaurantId: string, sessionId: string) {
  return adminGet<AdminSessionDetailResponse>(`/admin/restaurants/${restaurantId}/sessions/${sessionId}`);
}

export function clearSession(sessionId: string) {
  return adminPost<{ ok: true }>(`/admin/sessions/${sessionId}/clear`);
}

export function closeSession(sessionId: string) {
  return adminPost<{ ok?: true; session?: { id: string } }>(`/admin/sessions/${sessionId}/close`);
}

export function resolveException(exceptionId: string) {
  return adminPost<{ ok: true }>(`/admin/exceptions/${exceptionId}/resolve`);
}

export function fetchRestaurantMenu(restaurantId: string) {
  return adminGet<MenuSnapshot>(`/public/restaurants/${restaurantId}/menu`);
}

export function addSessionItem(sessionId: string, payload: { menuItemId: string; quantity?: number }) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(`/admin/sessions/${sessionId}/items`, payload);
}

export function applySessionCredit(sessionId: string, payload: { amountCents: number; label?: string }) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(`/admin/sessions/${sessionId}/credits`, payload);
}

export function voidSessionLine(sessionId: string, lineId: string, payload?: { reason?: string }) {
  return adminPost<{ ok: true; detail: AdminSessionDetailResponse }>(`/admin/sessions/${sessionId}/lines/${lineId}/void`, payload ?? {});
}

export function clearAssistRequest(restaurantId: string, sessionId: string): Promise<void> {
  return adminDelete(`/admin/restaurants/${restaurantId}/sessions/${sessionId}/assist`);
}

export function fetchRestaurantFlags(restaurantId: string) {
  return adminGet<{ flags: Record<string, boolean> }>(`/admin/restaurants/${restaurantId}/flags`);
}

export function updateRestaurantFlags(restaurantId: string, flags: Record<string, boolean>) {
  return adminPost<{ ok: true; flags: Record<string, boolean> }>(`/admin/restaurants/${restaurantId}/flags`, { flags });
}
