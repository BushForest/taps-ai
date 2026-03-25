import type { CurrencyCode, UUID } from "../domain/common";
import type { McpTool } from "./base";
export type ProviderPaymentIntentStatus = "requires_payment_method" | "requires_confirmation" | "requires_action" | "processing" | "requires_capture" | "succeeded" | "canceled";
export interface CreatePaymentIntentInput {
    restaurantId: UUID;
    sessionId: UUID;
    payerId: UUID;
    amountCents: number;
    tipCents: number;
    currency: CurrencyCode;
}
export interface CreatePaymentIntentOutput {
    providerPaymentIntentId: string;
    clientSecret?: string;
    status: ProviderPaymentIntentStatus;
}
export interface RetrievePaymentIntentInput {
    restaurantId: UUID;
    providerPaymentIntentId: string;
}
export interface RetrievePaymentIntentOutput {
    providerPaymentIntentId: string;
    clientSecret?: string;
    providerChargeId?: string;
    status: ProviderPaymentIntentStatus;
    amountCents: number;
    capturableAmountCents: number;
    capturedAmountCents: number;
    lastErrorCode?: string;
    lastErrorMessage?: string;
}
export interface CapturePaymentInput {
    restaurantId: UUID;
    providerPaymentIntentId: string;
    amountCents: number;
}
export interface CapturePaymentOutput {
    providerChargeId: string;
    status: "processing" | "succeeded" | "failed";
    capturedAmountCents: number;
}
export interface RefundPaymentInput {
    restaurantId: UUID;
    providerChargeId: string;
    amountCents: number;
}
export interface PaymentProviderContract {
    createIntent: McpTool<CreatePaymentIntentInput, CreatePaymentIntentOutput>;
    retrieveIntent: McpTool<RetrievePaymentIntentInput, RetrievePaymentIntentOutput>;
    captureIntent: McpTool<CapturePaymentInput, CapturePaymentOutput>;
    refundCharge: McpTool<RefundPaymentInput, {
        refundId: string;
        status: "pending" | "succeeded";
    }>;
}
//# sourceMappingURL=payments.d.ts.map