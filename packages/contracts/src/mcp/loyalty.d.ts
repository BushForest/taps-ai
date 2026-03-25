import type { LoyaltyProfile } from "../domain/loyalty";
import type { UUID } from "../domain/common";
import type { McpTool } from "./base";
export interface LookupCustomerInput {
    restaurantId: UUID;
    phoneE164: string;
}
export interface CreateCustomerInput {
    restaurantId: UUID;
    phoneE164: string;
}
export interface AwardPointsInput {
    restaurantId: UUID;
    profileId: UUID;
    sessionId: UUID;
    spendCents: number;
}
export interface LoyaltyProviderContract {
    lookupCustomer: McpTool<LookupCustomerInput, LoyaltyProfile | null>;
    createCustomer: McpTool<CreateCustomerInput, LoyaltyProfile>;
    awardPoints: McpTool<AwardPointsInput, {
        pointsAwarded: number;
        newBalance: number;
    }>;
}
//# sourceMappingURL=loyalty.d.ts.map