import { loadEnv } from "@taps/config";
import { initSentry } from "@taps/observability";
import { createApp } from "./bootstrap/create-app";

async function main() {
  const env = loadEnv();
  initSentry({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
  const { app } = await createApp(env);
  await app.listen({
    port: env.PORT,
    host: "0.0.0.0"
  });
}

void main();
