import type { CheckAssignmentCompleteness, CheckChangeSet, CheckSnapshot } from "../domain/check";
import type { LoyaltyProfile } from "../domain/loyalty";
import type { MenuSnapshot } from "../domain/menu";
import type { PaymentAttempt } from "../domain/payment";
import type { AllocationPlan, CloseValidationResult, Payer } from "../domain/split";
import type { DiningSession, SessionAccessView } from "../domain/session";
export interface CreateSessionFromTapRequest {
    tagCode: string;
}
export interface SessionSummaryResponse {
    access: SessionAccessView;
    check?: CheckSnapshot;
    menu?: MenuSnapshot;
}
export interface GetSessionStatusResponse {
    access: SessionAccessView;
    session?: DiningSession;
    check?: CheckSnapshot;
    payers?: Payer[];
    closeValidation?: CloseValidationResult;
    settlement?: GuestSettlementSummary;
}
export interface GuestSettlementSummary {
    tableComplete: boolean;
    tableCloseable: boolean;
    remainingBalanceCents: number;
    assignmentCompleteness: CheckAssignmentCompleteness;
    hasPendingPayments: boolean;
    hasBlockingMismatch: boolean;
    checkVersion?: number;
    lastUpdatedAt?: string;
    unassignedLineItemIds: string[];
    unassignedTinyItemIds: string[];
    payerCompletionCount: number;
    totalPayerCount: number;
}
export interface GetCheckResponse {
    snapshot: CheckSnapshot;
    changes?: CheckChangeSet;
}
export interface SubmitAllocationRequest {
    checkVersion: number;
    allocationPlan: AllocationPlan;
}
export interface SubmitAllocationResponse {
    allocationPlan: AllocationPlan;
    closeValidation: CloseValidationResult;
    check: CheckSnapshot;
}
export interface CreatePaymentIntentRequest {
    sessionId: string;
    payerId: string;
    allocationPlanId: string;
    checkVersion: number;
    amountCents: number;
    tipCents: number;
}
export interface CreatePaymentIntentResponse {
    paymentAttempt: PaymentAttempt;
    clientSecret?: string;
    staleCheck?: CheckSnapshot;
}
export interface AttachLoyaltyRequest {
    sessionId: string;
    payerId?: string;
    phoneNumber: string;
}
export interface AttachLoyaltyResponse {
    profile: LoyaltyProfile;
}
//# sourceMappingURL=public.d.ts.map