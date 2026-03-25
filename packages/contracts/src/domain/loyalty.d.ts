import type { UUID } from "./common";
export interface LoyaltyProfile {
    id: UUID;
    restaurantId: UUID;
    phoneE164: string;
    externalCustomerId?: string;
    status: "active" | "blocked";
    pointsBalance: number;
}
export interface LoyaltyAttachment {
    sessionId: UUID;
    payerId?: UUID;
    profileId: UUID;
    attachedAt: string;
}
//# sourceMappingURL=loyalty.d.ts.map