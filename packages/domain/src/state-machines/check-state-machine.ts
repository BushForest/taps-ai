import type { CheckStatus } from "@taps/contracts";

const allowedTransitions: Record<CheckStatus, CheckStatus[]> = {
  open: ["updated", "partially_paid", "fully_paid_pending_close", "closed", "voided", "transferred", "merged"],
  updated: ["open", "partially_paid", "voided", "transferred", "merged"],
  partially_paid: ["updated", "fully_paid_pending_close", "closed"],
  fully_paid_pending_close: ["closed", "updated"],
  closed: ["open"],
  voided: [],
  transferred: [],
  merged: []
};

export function canTransitionCheck(current: CheckStatus, next: CheckStatus): boolean {
  return allowedTransitions[current].includes(next);
}
