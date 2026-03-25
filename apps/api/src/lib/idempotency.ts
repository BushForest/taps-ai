import { createHash, randomUUID } from "node:crypto";

export function newId(prefix?: string): string {
  return prefix ? `${prefix}_${randomUUID()}` : randomUUID();
}

export function buildStableHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildPaymentIdempotencyKey(input: {
  sessionId: string;
  payerId: string;
  checkVersion: number;
  allocationHash: string;
  amountCents: number;
}): string {
  return `payint:${input.sessionId}:${input.payerId}:${input.checkVersion}:${input.allocationHash}:${input.amountCents}`;
}
