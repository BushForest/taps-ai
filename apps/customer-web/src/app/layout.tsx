import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ErrorBoundary } from "@sentry/nextjs";
import { TraceProvider } from "@taps/observability";
import "./global.css";

export const metadata: Metadata = {
  title: "BLACK+BLUE",
  description: "Order, track, and pay — right from your table.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BLACK+BLUE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111111",
};

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"]
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "900"]
});

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
    <html lang="en" className={`${sans.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>
        <TraceProvider>
          <ErrorBoundary fallback={<RootErrorFallback />}>
            {props.children}
          </ErrorBoundary>
        </TraceProvider>
      </body>
    </html>
  );
}
