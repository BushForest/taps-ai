"use client";

import React, { createContext, useContext, useState } from "react";

const TraceIdContext = createContext<string | null>(null);

interface TraceProviderProps {
  children: React.ReactNode;
}

/**
 * Generates a session-scoped UUID on first render and exposes it via context.
 * Wrap your app (or page) with this provider, then read it with `useTraceId()`.
 */
export function TraceProvider({ children }: TraceProviderProps): React.ReactElement {
  const [traceId] = useState<string>(() => crypto.randomUUID());

  return (
    <TraceIdContext.Provider value={traceId}>
      {children}
    </TraceIdContext.Provider>
  );
}

/**
 * Returns the session trace ID set by the nearest `<TraceProvider>`.
 * Throws if used outside of a `<TraceProvider>`.
 */
export function useTraceId(): string {
  const traceId = useContext(TraceIdContext);
  if (traceId === null) {
    throw new Error("useTraceId must be used within a <TraceProvider>");
  }
  return traceId;
}
