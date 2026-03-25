import type { PaymentAttemptStatus } from "@taps/contracts";

const allowedTransitions: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
  draft: ["intent_created"],
  intent_created: ["authorization_pending", "failed"],
  authorization_pending: ["authorized", "failed"],
  authorized: ["capture_pending", "voided"],
  capture_pending: ["captured", "failed"],
  captured: ["provider_succeeded_pending_pos", "reconciled"],
  provider_succeeded_pending_pos: ["reconciled", "failed"],
  reconciled: ["refunded"],
  failed: [],
  voided: [],
  refunded: []
};

export function canTransitionPayment(current: PaymentAttemptStatus, next: PaymentAttemptStatus): boolean {
  return allowedTransitions[current].includes(next);
}

export function isPendingPaymentStatus(status: PaymentAttemptStatus): boolean {
  return [
    "intent_created",
    "authorization_pending",
    "authorized",
    "capture_pending",
    "captured",
    "provider_succeeded_pending_pos"
  ].includes(status);
}
