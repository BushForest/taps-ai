export function getRoleFromCookie(
  cookieStore: { get(name: string): { value: string } | undefined }
): string | null {
  const token = cookieStore.get("taps_admin_jwt")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1]!, "base64url").toString()
    ) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
