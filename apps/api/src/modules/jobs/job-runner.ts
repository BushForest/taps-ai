import type { AppContainer } from "../../bootstrap/create-container";
import { createLogger, createTraceContext, withSentryScope } from "@taps/observability";
import { runPaymentReconciliationWorker } from "../workers/payment-reconciliation.worker";
import { runPollReconcilerWorker } from "../workers/poll-reconciler.worker";
import {
  BullMqJobDispatcher,
  isInProcessJobDispatcher,
  type JobName,
  type QueuedJob
} from "./job-dispatcher";

const RETRY_DELAYS_MS: Record<JobName, number> = {
  "session.expire_public_access": 60_000,
  "session.archive": 60_000,
  "payment.reconcile_pos_attach": 15_000,
  "pos.poll_session": 30_000
};

export async function processQueuedJob(container: AppContainer, job: QueuedJob): Promise<void> {
  switch (job.name) {
    case "session.expire_public_access": {
      const payload = job.payload as { sessionId?: string };
      if (!payload.sessionId) {
        throw new Error("session.expire_public_access requires payload.sessionId");
      }
      await container.agents.sessionAgent.expirePublicAccess(payload.sessionId, {
        actorType: "system",
        actorId: "queue_worker"
      });
      return;
    }
    case "session.archive": {
      const payload = job.payload as { sessionId?: string };
      if (!payload.sessionId) {
        throw new Error("session.archive requires payload.sessionId");
      }
      await container.agents.sessionAgent.archiveSession(payload.sessionId, {
        actorType: "system",
        actorId: "queue_worker"
      });
      return;
    }
    case "payment.reconcile_pos_attach": {
      const payload = job.payload as { paymentAttemptId?: string };
      if (!payload.paymentAttemptId) {
        throw new Error("payment.reconcile_pos_attach requires payload.paymentAttemptId");
      }
      await runPaymentReconciliationWorker(container, payload.paymentAttemptId);
      return;
    }
    case "pos.poll_session": {
      const payload = job.payload as { sessionId?: string };
      if (!payload.sessionId) {
        throw new Error("pos.poll_session requires payload.sessionId");
      }
      await runPollReconcilerWorker(container, payload.sessionId);
      return;
    }
    default:
      throw new Error(`Unhandled job ${job.name}`);
  }
}

export async function drainInMemoryJobs(
  container: AppContainer,
  options?: { limit?: number }
): Promise<{ processed: number; failed: number; remaining: number }> {
  if (!isInProcessJobDispatcher(container.jobs)) {
    throw new Error("drainInMemoryJobs requires the in-memory queue driver.");
  }

  const jobs = await container.jobs.reserveDue(options?.limit ?? 25);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processQueuedJob(container, job);
      await container.jobs.markCompleted(job.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      await container.jobs.markFailed(
        job.id,
        error instanceof Error ? error.message : "Unknown job failure",
        RETRY_DELAYS_MS[job.name]
      );
    }
  }

  return {
    processed,
    failed,
    remaining: (await container.jobs.listQueued()).length
  };
}

export async function startBullMqWorkers(container: AppContainer): Promise<{ close(): Promise<void> }> {
  if (container.jobs.driver !== "bullmq") {
    throw new Error("startBullMqWorkers requires QUEUE_DRIVER=bullmq.");
  }

  const dispatcher = container.jobs as BullMqJobDispatcher;
  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const connection = new IORedis(dispatcher.redisUrl, {
    maxRetriesPerRequest: null
  });
  const worker = new Worker(
    dispatcher.queueName,
    async (job) => {
      const { traceId } = createTraceContext();
      const log = createLogger({ service: "worker", traceId });
      return withSentryScope(
        async () => {
          try {
            log.info({ action: `job.${job.name}`, jobId: job.id }, "job starting");
            await processQueuedJob(container, {
              id: job.id?.toString() ?? "unknown",
              name: job.name as JobName,
              payload: (job.data?.payload ?? {}) as Record<string, unknown>,
              dedupeKey: job.data?.dedupeKey as string | undefined,
              availableAt: new Date((job.timestamp ?? Date.now()) + (job.delay ?? 0)).toISOString(),
              status: "running",
              createdAt: new Date(job.timestamp ?? Date.now()).toISOString(),
              attempts: (job.attemptsMade ?? 0) + 1,
              maxAttempts: job.opts.attempts ?? 1
            });
            log.info({ action: `job.${job.name}`, jobId: job.id }, "job completed");
          } catch (err) {
            log.error({ err, jobId: job.id, jobName: job.name, attempt: job.attemptsMade }, "job failed");
            throw err; // re-throw for BullMQ retry
          }
        },
        { traceId, action: `job.${job.name}` }
      );
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: connection as any,
      concurrency: 4
    }
  );

  return {
    async close() {
      await worker.close();
      await connection.quit();
    }
  };
}
