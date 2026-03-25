import type { StripeWebhookEvent, StripeWebhookMapping } from "@taps/mcp";
import { mapStripeWebhookEvent, verifyStripeWebhookSignature } from "@taps/mcp";

export function parseStripeWebhookEvent(input: {
  payload: string;
  signatureHeader?: string;
  webhookSecret?: string;
}):
  | { ok: true; event: StripeWebhookEvent; mapped: StripeWebhookMapping }
  | { ok: false; errorCode: string; errorMessage: string } {
  const verification = verifyStripeWebhookSignature({
    payload: input.payload,
    signatureHeader: input.signatureHeader,
    webhookSecret: input.webhookSecret
  });

  if (!verification.ok) {
    return verification;
  }

  return {
    ok: true,
    event: verification.event,
    mapped: mapStripeWebhookEvent(verification.event)
  };
}
