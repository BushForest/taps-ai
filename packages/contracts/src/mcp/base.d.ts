import type { CorrelationContext } from "../domain/common";
export interface McpRequestEnvelope<TInput> {
    provider: string;
    action: string;
    version: string;
    timeoutMs: number;
    idempotencyKey?: string;
    context: CorrelationContext;
    input: TInput;
}
export interface McpResponseEnvelope<TOutput> {
    ok: boolean;
    provider: string;
    action: string;
    version: string;
    retryable: boolean;
    providerTimestamp: string;
    providerReferenceIds?: Record<string, string>;
    output?: TOutput;
    raw?: unknown;
    errorCode?: string;
    errorMessage?: string;
}
export interface McpTool<TInput, TOutput> {
    execute(request: McpRequestEnvelope<TInput>): Promise<McpResponseEnvelope<TOutput>>;
}
//# sourceMappingURL=base.d.ts.map