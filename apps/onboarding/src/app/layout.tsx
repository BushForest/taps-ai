import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ErrorBoundary } from "@sentry/nextjs";
import { TraceProvider } from "@taps/observability";

export const metadata: Metadata = {
  title: "TAPs Eats — Restaurant Onboarding",
  description: "Set up your restaurant on the TAPs Eats platform.",
};

function RootErrorFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p>Please refresh the page to continue.</p>
    </div>
  );
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TraceProvider>
          <ErrorBoundary fallback={<RootErrorFallback />}>
            {props.children}
          </ErrorBoundary>
        </TraceProvider>
      </body>
    </html>
  );
}
