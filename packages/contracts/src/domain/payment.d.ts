import type { CurrencyCode, UUID } from "./common";
export type PaymentAttemptStatus = "draft" | "intent_created" | "authorization_pending" | "authorized" | "capture_pending" | "captured" | "provider_succeeded_pending_pos" | "reconciled" | "failed" | "voided" | "refunded";
export type PosAttachmentStatus = "not_required" | "pending" | "attached" | "failed";
export interface PaymentAttempt {
    id: UUID;
    sessionId: UUID;
    checkSnapshotId: UUID;
    checkVersion: number;
    payerId: UUID;
    allocationPlanId: UUID;
    status: PaymentAttemptStatus;
    amountCents: number;
    tipCents: number;
    currency: CurrencyCode;
    provider: string;
    providerPaymentIntentId?: string;
    clientSecret?: string;
    providerChargeId?: string;
    posAttachmentStatus: PosAttachmentStatus;
    idempotencyKey: string;
    authorizedAt?: string;
    capturedAt?: string;
    failedAt?: string;
    loyaltyAwardedAt?: string;
    loyaltyPointsAwarded?: number;
    errorCode?: string;
    errorMessage?: string;
}
export interface PaymentSummary {
    paidCents: number;
    pendingCents: number;
    failedCents: number;
    remainingCents: number;
}
//# sourceMappingURL=payment.d.ts.map