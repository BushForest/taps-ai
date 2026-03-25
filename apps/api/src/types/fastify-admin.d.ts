import type { AdminTokenPayload } from "../http/auth";

declare module "fastify" {
  interface FastifyRequest {
    adminPayload?: AdminTokenPayload;
  }
}
