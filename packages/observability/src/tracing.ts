export interface TraceContext {
  traceId: string;
  spanId: string;
}

export function createTraceContext(): TraceContext {
  return {
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID()
  };
}
