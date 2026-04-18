"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred in the admin dashboard.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
