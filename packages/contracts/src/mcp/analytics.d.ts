import type { UUID } from "../domain/common";
import type { McpTool } from "./base";
export interface AnalyticsEventInput {
    restaurantId: UUID;
    eventName: string;
    eventVersion: string;
    subjectId?: UUID;
    payload: Record<string, unknown>;
}
export interface AnalyticsProviderContract {
    publishEvent: McpTool<AnalyticsEventInput, {
        accepted: boolean;
    }>;
}
//# sourceMappingURL=analytics.d.ts.map