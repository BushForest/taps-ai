import type { SessionStatus } from "@taps/contracts";

const allowedTransitions: Record<SessionStatus, SessionStatus[]> = {
  active: ["payment_in_progress", "partially_paid", "fully_paid", "cleared_locked", "transferred", "reopened"],
  payment_in_progress: ["active", "partially_paid", "fully_paid", "cleared_locked"],
  partially_paid: ["payment_in_progress", "fully_paid", "cleared_locked"],
  fully_paid: ["closed", "cleared_locked"],
  closed: ["public_expired", "reopened"],
  cleared_locked: ["archived"],
  public_expired: ["archived"],
  archived: [],
  transferred: ["archived"],
  reopened: ["active"]
};

export function canTransitionSession(current: SessionStatus, next: SessionStatus): boolean {
  return allowedTransitions[current].includes(next);
}
