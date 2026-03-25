import type { SquareWebhookEvent, SquareWebhookMapping } from "@taps/mcp";
import { mapSquareWebhookEvent, verifySquareWebhookSignature } from "@taps/mcp";

export function parseSquareWebhookEvent(input: {
  notificationUrl: string;
  payload: string;
  signatureHeader?: string;
  signatureKey?: string;
}):
  | { ok: true; event: SquareWebhookEvent; mapped: SquareWebhookMapping }
  | { ok: false; errorCode: string; errorMessage: string } {
  const verification = verifySquareWebhookSignature({
    notificationUrl: input.notificationUrl,
    payload: input.payload,
    signatureHeader: input.signatureHeader,
    signatureKey: input.signatureKey
  });

  if (!verification.ok) {
    return verification;
  }

  return {
    ok: true,
    event: verification.event,
    mapped: mapSquareWebhookEvent(verification.event)
  };
}
