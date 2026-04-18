import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  DATA_STORE_DRIVER: z.enum(["memory", "postgres"]).default("memory"),
  QUEUE_DRIVER: z.enum(["memory", "bullmq"]).default("memory"),
  POS_PROVIDER_MODE: z.enum(["memory", "square"]).default("memory"),
  PAYMENT_PROVIDER_MODE: z.enum(["mock", "stripe"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_VERSION: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(1).optional(),
  SENTRY_DSN: z.string().optional(),
  API_BASE_URL: z.string().url(),
  PUBLIC_BASE_URL: z.string().url(),
  ADMIN_BASE_URL: z.string().url()
}).superRefine((env, context) => {
  if (env.DATA_STORE_DRIVER === "postgres" && !env.DATABASE_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "DATABASE_URL is required when DATA_STORE_DRIVER=postgres."
    });
  }

  if (env.QUEUE_DRIVER === "bullmq" && !env.REDIS_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["REDIS_URL"],
      message: "REDIS_URL is required when QUEUE_DRIVER=bullmq."
    });
  }

  if (env.PAYMENT_PROVIDER_MODE === "stripe" && !env.STRIPE_SECRET_KEY) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["STRIPE_SECRET_KEY"],
      message: "STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER_MODE=stripe."
    });
  }

  if (env.POS_PROVIDER_MODE === "square" && (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SQUARE_ACCESS_TOKEN"],
      message: "SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are required when POS_PROVIDER_MODE=square."
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(raw: Record<string, string | undefined> = process.env): AppEnv {
  return envSchema.parse(raw);
}
