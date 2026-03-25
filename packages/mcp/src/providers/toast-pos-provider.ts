import type { PosProviderContract } from "@taps/contracts";
import { createMcpTool, errorResponse } from "../runtime/mcp-tool";

export function createToastPosPlaceholder(): PosProviderContract {
  return {
    fetchMenu: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    fetchCheck: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    createOrder: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    attachPayment: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    fetchTableStatus: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    detectClosedCheck: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    ),
    syncVoidsAndCancels: createMcpTool(async (request) =>
      errorResponse(request, "NOT_IMPLEMENTED", "Toast adapter placeholder only.")
    )
  };
}
