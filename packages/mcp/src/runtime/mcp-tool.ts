import type { McpRequestEnvelope, McpResponseEnvelope, McpTool } from "@taps/contracts";

export function createMcpTool<TInput, TOutput>(
  handler: (request: McpRequestEnvelope<TInput>) => Promise<McpResponseEnvelope<TOutput>>
): McpTool<TInput, TOutput> {
  return {
    execute(request) {
      return handler(request);
    }
  };
}

export function okResponse<TOutput>(
  request: Pick<McpRequestEnvelope<unknown>, "provider" | "action" | "version">,
  output: TOutput,
  extra?: Partial<McpResponseEnvelope<TOutput>>
): McpResponseEnvelope<TOutput> {
  return {
    ok: true,
    provider: request.provider,
    action: request.action,
    version: request.version,
    retryable: false,
    providerTimestamp: new Date().toISOString(),
    output,
    ...extra
  };
}

export function errorResponse<TOutput>(
  request: Pick<McpRequestEnvelope<unknown>, "provider" | "action" | "version">,
  errorCode: string,
  errorMessage: string,
  retryable = false
): McpResponseEnvelope<TOutput> {
  return {
    ok: false,
    provider: request.provider,
    action: request.action,
    version: request.version,
    retryable,
    providerTimestamp: new Date().toISOString(),
    errorCode,
    errorMessage
  };
}
