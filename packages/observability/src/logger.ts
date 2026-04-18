import pino from "pino";
import * as Sentry from "@sentry/node";

export interface TapsLoggerOptions {
  service?: string;
  traceId?: string;
}

const REDACTED_FIELDS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.secret",
];

export function createLogger(options?: TapsLoggerOptions): pino.Logger {
  const service = options?.service ?? "taps";

  const logger = pino({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    base: { service },
    redact: REDACTED_FIELDS,
  });

  // Bind traceId to every log line when provided
  const bound =
    options?.traceId != null
      ? logger.child({ traceId: options.traceId })
      : logger;

  // Wrap the error method to auto-forward to Sentry when initialised.
  // We use a method wrapper rather than a transport so the forwarding is
  // synchronous and works in all environments (Node, Edge, test).
  const originalError: pino.LogFn = bound.error.bind(bound);
  bound.error = (objOrMsg: unknown, ...args: unknown[]) => {
    if (Sentry.getClient() !== undefined) {
      // Extract an Error object if the first argument is one.
      // When the first argument is a plain object (pino's { err, ...meta } pattern),
      // prefer the `err` or `error` property if it is an actual Error instance so
      // Sentry captures the real stack trace instead of "[object Object]".
      // Fall back to a synthetic error for plain strings / other values.
      const plainObj =
        objOrMsg !== null &&
        typeof objOrMsg === "object" &&
        !(objOrMsg instanceof Error)
          ? (objOrMsg as Record<string, unknown>)
          : null;
      const err: Error =
        objOrMsg instanceof Error
          ? objOrMsg
          : plainObj?.err instanceof Error
            ? plainObj.err
            : plainObj?.error instanceof Error
              ? plainObj.error
              : new Error(typeof objOrMsg === "string" ? objOrMsg : String(objOrMsg));

      // Pass plain object fields as Sentry extra context when available
      const hint = plainObj ? { extra: plainObj } : undefined;

      Sentry.captureException(err, hint);
    }

    // Always call through to the original Pino logger
    (originalError as (...a: unknown[]) => void)(objOrMsg, ...args);
  };

  return bound;
}
