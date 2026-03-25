import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().default("http://localhost:4000"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
});

function validateEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }

  return result.data;
}

export const env = validateEnv();
