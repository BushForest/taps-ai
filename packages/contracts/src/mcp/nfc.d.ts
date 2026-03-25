import type { UUID } from "../domain/common";
import type { McpTool } from "./base";
export interface ResolveTagInput {
    tagCode: string;
}
export interface ResolveTagOutput {
    restaurantId: UUID;
    tableId: UUID;
    nfcTagId: UUID;
}
export interface NfcRegistryContract {
    resolveTag: McpTool<ResolveTagInput, ResolveTagOutput>;
}
//# sourceMappingURL=nfc.d.ts.map