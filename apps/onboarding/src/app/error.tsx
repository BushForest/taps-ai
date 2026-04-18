"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p>We&apos;re sorry — an unexpected error occurred.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
