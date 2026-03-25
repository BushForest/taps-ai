import type { NfcRegistryContract, ResolveTagOutput } from "@taps/contracts";
import { createMcpTool, errorResponse, okResponse } from "../runtime/mcp-tool";

export function createMemoryNfcProvider(seed: Record<string, ResolveTagOutput> = {}): NfcRegistryContract {
  return {
    resolveTag: createMcpTool(async (request) => {
      const match = seed[request.input.tagCode];

      if (!match) {
        return errorResponse(request, "TAG_NOT_FOUND", `No table mapping found for tag ${request.input.tagCode}`);
      }

      return okResponse(request, match);
    })
  };
}
