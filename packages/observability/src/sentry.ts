import * as Sentry from "@sentry/node";

export interface SentryInitOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

export interface SentryContext {
  traceId?: string;
  restaurantId?: string;
  userId?: string;
  action?: string;
}

/**
 * One-call Sentry bootstrap. Safe to call with undefined DSN — no-ops when DSN
 * is falsy so local / test environments are unaffected.
 */
export function initSentry(options: SentryInitOptions): void {
  if (!options.dsn) {
    return;
  }

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    tracesSampleRate: options.tracesSampleRate ?? 0,
  });
}

/**
 * Run `fn` inside an isolated Sentry scope with the provided context tags set.
 * Tags are restored when the scope exits. Apps should use this instead of
 * importing `@sentry/node` directly.
 */
export async function withSentryScope<T>(
  fn: () => Promise<T>,
  ctx: SentryContext,
): Promise<T> {
  return Sentry.withIsolationScope(async (scope) => {
    if (ctx.traceId) scope.setTag("trace_id", ctx.traceId);
    if (ctx.restaurantId) scope.setTag("restaurantId", ctx.restaurantId);
    if (ctx.userId) scope.setTag("userId", ctx.userId);
    if (ctx.action) scope.setTag("action", ctx.action);
    return fn();
  });
}

/**
 * Set a single tag on the current Sentry scope. Allows API hooks to annotate
 * the active scope without importing `@sentry/node` directly.
 */
export function setSentryTag(key: string, value: string): void {
  Sentry.getIsolationScope().setTag(key, value);
}
