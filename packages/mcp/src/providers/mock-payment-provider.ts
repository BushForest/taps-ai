import type { PaymentProviderContract } from "@taps/contracts";
import { createMcpTool, okResponse } from "../runtime/mcp-tool";

export function createMockPaymentProvider(): PaymentProviderContract {
  return {
    createIntent: createMcpTool(async (request) =>
      okResponse(request, {
        providerPaymentIntentId: `pi_${crypto.randomUUID()}`,
        clientSecret: `secret_${crypto.randomUUID()}`,
        status: "requires_payment_method"
      })
    ),
    retrieveIntent: createMcpTool(async (request) =>
      okResponse(request, {
        providerPaymentIntentId: request.input.providerPaymentIntentId,
        clientSecret: `secret_${request.input.providerPaymentIntentId}`,
        providerChargeId: `ch_${request.input.providerPaymentIntentId}`,
        status: "requires_capture",
        amountCents: 0,
        capturableAmountCents: 0,
        capturedAmountCents: 0
      })
    ),
    captureIntent: createMcpTool(async (request) =>
      okResponse(request, {
        providerChargeId: `ch_${crypto.randomUUID()}`,
        status: "succeeded",
        capturedAmountCents: request.input.amountCents
      })
    ),
    refundCharge: createMcpTool(async (request) =>
      okResponse(request, {
        refundId: `re_${crypto.randomUUID()}`,
        status: "succeeded"
      })
    )
  };
}
