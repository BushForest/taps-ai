import type { UUID, VersionedRecord } from "./common";
export type AllocationStrategy = "even" | "by_item" | "fractional" | "custom_amount" | "hybrid";
export type AllocationTargetType = "line_item" | "remaining_balance";
export type AllocationPlanStatus = "draft" | "proposed" | "locked_for_payment" | "partially_funded" | "completed" | "invalidated";
export interface Payer {
    id: UUID;
    sessionId: UUID;
    displayName: string;
    phoneE164?: string;
    loyaltyProfileId?: UUID;
    status: "active" | "completed" | "left";
}
export interface AllocationEntry {
    id: UUID;
    payerId: UUID;
    targetType: AllocationTargetType;
    targetId: UUID | "remaining";
    shareBasisPoints: number;
    assignedCents: number;
    inheritedFromParent?: boolean;
    metadata?: Record<string, unknown>;
}
export interface AllocationPlan extends VersionedRecord {
    id: UUID;
    sessionId: UUID;
    checkSnapshotId: UUID;
    checkVersion: number;
    status: AllocationPlanStatus;
    strategy: AllocationStrategy;
    allocationHash: string;
    createdByPayerId?: UUID;
    entries: AllocationEntry[];
    createdAt: string;
}
export interface AllocationSummary {
    payerId: UUID;
    assignedLineItemIds: UUID[];
    amountCents: number;
}
export interface CloseValidationResult {
    canClose: boolean;
    reasons: string[];
    unassignedLineItemIds: UUID[];
    remainingBalanceCents: number;
    toleranceExceededByCents: number;
}
//# sourceMappingURL=split.d.ts.map