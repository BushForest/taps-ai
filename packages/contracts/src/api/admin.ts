import type { CheckSnapshot } from "../domain/check";
import type { PaymentAttempt } from "../domain/payment";
import type { DiningSession, SessionAccessView } from "../domain/session";
import type { CloseValidationResult, Payer } from "../domain/split";
import type { GuestSettlementSummary } from "./public";

export interface AdminListSessionsRequest {
  restaurantId: string;
  status?: string;
}

export interface ResolveExceptionRequest {
  exceptionId: string;
  resolutionCode: string;
  notes?: string;
}

export interface AdminExceptionSummary {
  id: string;
  restaurantId: string;
  sessionId?: string;
  checkSnapshotId?: string;
  paymentAttemptId?: string;
  type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "investigating" | "resolved" | "ignored";
  summary: string;
  details?: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
}

export interface AdminSessionSummary {
  session: DiningSession;
  access: SessionAccessView;
  remainingBalanceCents: number;
  assignmentCompleteness: GuestSettlementSummary["assignmentCompleteness"];
  hasPendingPayments: boolean;
  hasBlockingMismatch: boolean;
  payerCompletionCount: number;
  totalPayerCount: number;
  checkVersion?: number;
  latestCheckUpdatedAt?: string;
  openExceptionCount: number;
  closeValidation?: CloseValidationResult;
}

export interface AdminTableSummary {
  tableId: string;
  tableLabel: string;
  sessionId?: string;
  sessionStatus?: DiningSession["status"];
  publicAccessAllowed: boolean;
  supportAccessAllowed: boolean;
  remainingBalanceCents: number;
  openExceptionCount: number;
  payerCompletionCount: number;
  totalPayerCount: number;
  updatedAt?: string;
  assistRequested?: boolean;
  guestCount?: number;
  orderSummary?: string;
  openedAt?: string;
}

export interface AdminRestaurantOverviewResponse {
  restaurantId: string;
  tableCount: number;
  activeSessionCount: number;
  blockedSessionCount: number;
  openExceptionCount: number;
  tables: AdminTableSummary[];
  sessions: AdminSessionSummary[];
  exceptions: AdminExceptionSummary[];
}

export interface AdminSessionDetailResponse {
  session: DiningSession;
  access: SessionAccessView;
  check?: CheckSnapshot;
  payers: Payer[];
  paymentAttempts: PaymentAttempt[];
  exceptions: AdminExceptionSummary[];
  closeValidation?: CloseValidationResult;
  settlement?: GuestSettlementSummary;
  latestAllocationPlanId?: string;
}
