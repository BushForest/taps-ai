import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import type { AppEnv } from "@taps/config";
import { createLogger } from "@taps/observability";
import { createDbClient } from "@taps/db";
import { createContainer, type ContainerRuntimeOptions } from "./create-container";
import { attachErrorHandler, registerRoutes } from "../http/register-routes";

export async function createApp(env?: AppEnv, runtimeOverrides?: Partial<ContainerRuntimeOptions>) {
  const app = Fastify({
    loggerInstance: createLogger()
  });
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true
  });
  // Accept any content-type (including absent) so webhook routes work with
  // raw string bodies (Stripe/Square may omit or vary the Content-Type header
  // in tests and certain environments). The built-in application/json parser
  // still takes precedence for JSON requests.
  app.addContentTypeParser("*", { parseAs: "string" }, (_req, body, done) => done(null, body));
  const envOptions: Partial<ContainerRuntimeOptions> = {
    ...(env
      ? {
          dataStoreDriver: env.DATA_STORE_DRIVER,
          databaseUrl: env.DATABASE_URL,
          redisUrl: env.REDIS_URL,
          queueDriver: env.QUEUE_DRIVER,
          posProviderMode: env.POS_PROVIDER_MODE,
          paymentProviderMode: env.PAYMENT_PROVIDER_MODE,
          square: {
            accessToken: env.SQUARE_ACCESS_TOKEN,
            locationId: env.SQUARE_LOCATION_ID,
            environment: env.SQUARE_ENVIRONMENT,
            webhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY
          },
          stripe: {
            secretKey: env.STRIPE_SECRET_KEY,
            publishableKey: env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET,
            apiVersion: env.STRIPE_API_VERSION
          }
        }
      : {}),
  };
  const runtimeOptions: Partial<ContainerRuntimeOptions> = {
    ...envOptions,
    ...runtimeOverrides,
    square: {
      ...envOptions.square,
      ...runtimeOverrides?.square
    },
    stripe: {
      ...envOptions.stripe,
      ...runtimeOverrides?.stripe
    }
  };
  const container = createContainer(runtimeOptions);

  // Resolve the db client for leads endpoints (bypasses the repository layer).
  // Only available when DATA_STORE_DRIVER=postgres; memory mode leaves it undefined.
  const db =
    runtimeOptions.dbClient ??
    (runtimeOptions.dataStoreDriver === "postgres" && runtimeOptions.databaseUrl
      ? createDbClient(runtimeOptions.databaseUrl)
      : undefined);

  attachErrorHandler(app);
  // Register routes inside a plugin so they are registered AFTER fastify-raw-body
  // initializes and installs its onRoute hook. Routes registered before that hook
  // is live are silently ignored by fastify-raw-body (see its README).
  await app.register(async (appInstance) => {
    await registerRoutes(appInstance, container, {
      apiBaseUrl: env?.API_BASE_URL,
      stripeWebhookSecret: runtimeOptions.stripe?.webhookSecret ?? env?.STRIPE_WEBHOOK_SECRET,
      squareWebhookSignatureKey: runtimeOptions.square?.webhookSignatureKey ?? env?.SQUARE_WEBHOOK_SIGNATURE_KEY,
      jwtSecret: env?.JWT_SECRET,
      db
    });
  });

  return { app, container };
}
