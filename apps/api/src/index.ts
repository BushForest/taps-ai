import { loadEnv } from "@taps/config";
import { createApp } from "./bootstrap/create-app";

async function main() {
  const env = loadEnv();
  const { app } = await createApp(env);
  await app.listen({
    port: env.PORT,
    host: "0.0.0.0"
  });
}

void main();
