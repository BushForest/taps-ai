import type { AuditStamp, CurrencyCode, UUID, VersionedRecord } from "./common";

export type CheckStatus =
  | "open"
  | "updated"
  | "partially_paid"
  | "fully_paid_pending_close"
  | "closed"
  | "voided"
  | "transferred"
  | "merged";

export type CheckLineKind = "item" | "modifier" | "condiment" | "fee" | "discount" | "tax";

export type CheckLineStatus = "open" | "sent" | "voided" | "cancelled" | "transferred" | "paid";
export type CheckAssignmentCompleteness = "unassigned" | "partially_assigned" | "fully_assigned";

export interface CheckLineItem {
  id: UUID;
  posLineId: string;
  parentLineId?: UUID;
  kind: CheckLineKind;
  name: string;
  quantity: number;
  unitPriceCents: number;
  extendedPriceCents: number;
  status: CheckLineStatus;
  isStandalone: boolean;
  isModifier: boolean;
  modifierGroup?: string;
  taxCents?: number;
  feeCents?: number;
  grossCents: number;
  assignedCents: number;
  childLineIds: UUID[];
  assignmentStatus: CheckAssignmentCompleteness;
  isTinyCharge: boolean;
  metadata?: Record<string, unknown>;
}

export interface CheckAssignmentSummary {
  completeness: CheckAssignmentCompleteness;
  assignedLineCents: number;
  unassignedLineCents: number;
  outstandingBalanceCents: number;
  unassignedLineItemIds: UUID[];
  unassignedTinyItemIds: UUID[];
}

export interface CheckSnapshot extends AuditStamp, VersionedRecord {
  id: UUID;
  restaurantId: UUID;
  sessionId: UUID;
  posCheckId: string;
  sourceSystem: string;
  sourceCheckVersion?: string;
  status: CheckStatus;
  currency: CurrencyCode;
  subtotalCents: number;
  taxCents: number;
  feeCents: number;
  discountCents: number;
  totalCents: number;
  amountPaidCents: number;
  remainingBalanceCents: number;
  assignmentSummary: CheckAssignmentSummary;
  sourceUpdatedAt: string;
  closedAt?: string;
  lines: CheckLineItem[];
}

export interface CheckChangeSet {
  checkId: UUID;
  previousVersion: number;
  nextVersion: number;
  addedLineIds: UUID[];
  removedLineIds: UUID[];
  changedLineIds: UUID[];
  totalsChanged: boolean;
}
