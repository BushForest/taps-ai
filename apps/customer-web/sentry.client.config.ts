import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: process.env.SENTRY_ENABLE_REPLAY === "true" ? 1.0 : 0,
  integrations: [Sentry.replayIntegration()],
});
