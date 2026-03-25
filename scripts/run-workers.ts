import { loadEnv } from "@taps/config";
import { createApp } from "../apps/api/src/bootstrap/create-app";
import { drainInMemoryJobs, startBullMqWorkers } from "../apps/api/src/modules/jobs/job-runner";

async function main() {
  const env = loadEnv();
  const { app, container } = await createApp(env);

  if (container.jobs.driver === "memory") {
    const result = await drainInMemoryJobs(container, {
      limit: process.argv.includes("--all") ? 200 : 50
    });
    console.log(`Processed ${result.processed} job(s), failed ${result.failed}, remaining ${result.remaining}.`);
    await app.close();
    return;
  }

  const worker = await startBullMqWorkers(container);
  console.log(`BullMQ worker started for queue ${container.jobs.queueName}. Press Ctrl+C to stop.`);

  const shutdown = async () => {
    await worker.close();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
