import type { AuditStamp, UUID, VersionedRecord } from "./common";

export type SessionStatus =
  | "active"
  | "payment_in_progress"
  | "partially_paid"
  | "fully_paid"
  | "closed"
  | "cleared_locked"
  | "public_expired"
  | "archived"
  | "transferred"
  | "reopened";

export interface PhysicalTable extends AuditStamp {
  id: UUID;
  restaurantId: UUID;
  tableCode: string;
  displayName: string;
  serviceArea?: string;
  activeSessionId?: UUID;
}

export interface NfcTag extends AuditStamp {
  id: UUID;
  restaurantId: UUID;
  tableId: UUID;
  tagCode: string;
  status: "active" | "disabled" | "retired";
  lastTappedAt?: string;
}

export interface DiningSession extends AuditStamp, VersionedRecord {
  id: UUID;
  restaurantId: UUID;
  tableId: UUID;
  nfcTagId: UUID;
  publicToken: string;
  status: SessionStatus;
  openedAt: string;
  closedAt?: string;
  publicExpiresAt?: string;
  auditExpiresAt?: string;
  archivedAt?: string;
  reopenedFromSessionId?: UUID;
  transferTargetTableId?: UUID;
  currentCheckId?: UUID;
}

export interface SessionAccessView {
  session: DiningSession;
  restaurantId: UUID;
  tableId: UUID;
  publicAccessAllowed: boolean;
  supportAccessAllowed: boolean;
  reason?: "not_found" | "closed" | "cleared" | "expired" | "archived" | "token_mismatch";
}
