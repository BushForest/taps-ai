import { createHmac, timingSafeEqual } from "node:crypto";

export interface GuestTokenPayload {
  sub: string; // session publicToken
  role: "guest";
  restaurantId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AdminTokenPayload {
  sub: string; // admin user id
  role: "restaurant_admin";
  restaurantId: string;
  iat: number;
  exp: number;
}

export type TokenPayload = GuestTokenPayload | AdminTokenPayload;

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function sign(header: string, payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
}

export function issueJwt(payload: Omit<TokenPayload, "iat" | "exp">, secret: string, ttlSeconds: number): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = base64urlEncode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const sig = sign(header, fullPayload, secret);
  return `${header}.${fullPayload}.${sig}`;
}

export class JwtVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtVerificationError";
  }
}

export function verifyJwt(token: string, secret: string): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtVerificationError("Malformed token");
  }

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const expectedSig = sign(headerB64, payloadB64, secret);
  const expectedBuf = Buffer.from(expectedSig, "base64url");
  const actualBuf = Buffer.from(sigB64, "base64url");

  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    throw new JwtVerificationError("Invalid signature");
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64)) as TokenPayload;
  } catch {
    throw new JwtVerificationError("Malformed payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new JwtVerificationError("Token expired");
  }

  return payload;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
