import type { UUID } from "../domain/common";
import type { McpTool } from "./base";
export interface SmsNotificationInput {
    restaurantId: UUID;
    phoneE164: string;
    message: string;
}
export interface NotificationProviderContract {
    sendSms: McpTool<SmsNotificationInput, {
        providerMessageId: string;
    }>;
}
//# sourceMappingURL=notifications.d.ts.map