import { newId } from "../../lib/idempotency";

export type JobName =
  | "session.expire_public_access"
  | "session.archive"
  | "payment.reconcile_pos_attach"
  | "pos.poll_session";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "dead_letter";

export interface QueuedJob<TPayload = Record<string, unknown>> {
  id: string;
  name: JobName;
  payload: TPayload;
  dedupeKey?: string;
  availableAt: string;
  status: JobStatus;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

export interface EnqueueJobInput<TPayload = Record<string, unknown>> {
  name: JobName;
  payload: TPayload;
  dedupeKey?: string;
  availableAt?: string;
  maxAttempts?: number;
  retryBackoffMs?: number;
}

export interface JobDispatcher {
  readonly driver: "memory" | "bullmq";
  enqueue<TPayload = Record<string, unknown>>(input: EnqueueJobInput<TPayload>): Promise<QueuedJob<TPayload>>;
  listQueued(name?: JobName): Promise<QueuedJob[]>;
}

export interface InProcessJobDispatcher extends JobDispatcher {
  reserveDue(limit?: number): Promise<QueuedJob[]>;
  markCompleted(jobId: string): Promise<void>;
  markFailed(jobId: string, errorMessage: string, retryDelayMs?: number): Promise<void>;
}

export function isInProcessJobDispatcher(dispatcher: JobDispatcher): dispatcher is InProcessJobDispatcher {
  return dispatcher.driver === "memory";
}

export class InMemoryJobDispatcher implements InProcessJobDispatcher {
  readonly driver = "memory" as const;
  private readonly jobs = new Map<string, QueuedJob>();

  async enqueue<TPayload = Record<string, unknown>>(input: EnqueueJobInput<TPayload>): Promise<QueuedJob<TPayload>> {
    if (input.dedupeKey) {
      const existing = [...this.jobs.values()].find(
        (job) =>
          job.dedupeKey === input.dedupeKey &&
          (job.status === "queued" || job.status === "running")
      );
      if (existing) {
        return existing as QueuedJob<TPayload>;
      }
    }

    const now = new Date().toISOString();
    const job: QueuedJob<TPayload> = {
      id: newId("job"),
      name: input.name,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      availableAt: input.availableAt ?? now,
      status: "queued",
      createdAt: now,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5
    };

    this.jobs.set(job.id, job as QueuedJob);
    return job;
  }

  async listQueued(name?: JobName): Promise<QueuedJob[]> {
    return [...this.jobs.values()].filter(
      (job) =>
        (!name || job.name === name) &&
        (job.status === "queued" || job.status === "running")
    );
  }

  async reserveDue(limit = 25): Promise<QueuedJob[]> {
    const now = Date.now();
    const due = [...this.jobs.values()]
      .filter((job) => job.status === "queued" && Date.parse(job.availableAt) <= now)
      .sort((left, right) => Date.parse(left.availableAt) - Date.parse(right.availableAt))
      .slice(0, limit);

    for (const job of due) {
      this.jobs.set(job.id, {
        ...job,
        status: "running",
        attempts: job.attempts + 1
      });
    }

    return due.map((job) => this.jobs.get(job.id) ?? job);
  }

  async markCompleted(jobId: string): Promise<void> {
    const current = this.jobs.get(jobId);
    if (!current) {
      return;
    }

    this.jobs.set(jobId, {
      ...current,
      status: "completed"
    });
  }

  async markFailed(jobId: string, errorMessage: string, retryDelayMs = 30_000): Promise<void> {
    const current = this.jobs.get(jobId);
    if (!current) {
      return;
    }

    const terminal = current.attempts >= current.maxAttempts;
    this.jobs.set(jobId, {
      ...current,
      status: terminal ? "dead_letter" : "queued",
      availableAt: terminal ? current.availableAt : new Date(Date.now() + retryDelayMs).toISOString(),
      lastError: errorMessage
    });
  }
}

export class BullMqJobDispatcher implements JobDispatcher {
  readonly driver = "bullmq" as const;

  constructor(
    readonly redisUrl: string,
    readonly queueName = "taps-mvp"
  ) {}

  async enqueue<TPayload = Record<string, unknown>>(input: EnqueueJobInput<TPayload>): Promise<QueuedJob<TPayload>> {
    const { Queue } = await import("bullmq");
    const IORedis = (await import("ioredis")).default;
    const connection = new IORedis(this.redisUrl, {
      maxRetriesPerRequest: null
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue = new Queue(this.queueName, { connection: connection as any });

    const now = new Date().toISOString();
    const jobId = input.dedupeKey ?? newId("job");
    const availableAt = input.availableAt ?? now;
    const delay = Math.max(Date.parse(availableAt) - Date.now(), 0);
    const maxAttempts = input.maxAttempts ?? 5;

    await queue.add(
      input.name,
      {
        payload: input.payload,
        dedupeKey: input.dedupeKey,
        createdAt: now,
        maxAttempts
      },
      {
        jobId,
        delay,
        attempts: maxAttempts,
        backoff: {
          type: "exponential",
          delay: input.retryBackoffMs ?? 30_000
        },
        removeOnComplete: 250,
        removeOnFail: 250
      }
    );

    await queue.close();
    await connection.quit();

    return {
      id: jobId,
      name: input.name,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      availableAt,
      status: "queued",
      createdAt: now,
      attempts: 0,
      maxAttempts
    };
  }

  async listQueued(name?: JobName): Promise<QueuedJob[]> {
    const { Queue } = await import("bullmq");
    const IORedis = (await import("ioredis")).default;
    const connection = new IORedis(this.redisUrl, {
      maxRetriesPerRequest: null
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue = new Queue(this.queueName, { connection: connection as any });

    const jobs = await queue.getJobs(["waiting", "delayed", "active"], 0, 200);
    await queue.close();
    await connection.quit();

    return jobs
      .filter((job) => !name || job.name === name)
      .map((job) => ({
        id: job.id?.toString() ?? newId("job"),
        name: job.name as JobName,
        payload: (job.data?.payload ?? {}) as Record<string, unknown>,
        dedupeKey: job.data?.dedupeKey as string | undefined,
        availableAt: new Date((job.timestamp ?? Date.now()) + (job.delay ?? 0)).toISOString(),
        status: job.processedOn ? "running" : "queued",
        createdAt: new Date(job.timestamp ?? Date.now()).toISOString(),
        attempts: job.attemptsMade ?? 0,
        maxAttempts: job.opts.attempts ?? 1
      }));
  }
}
