import pino from "pino";

export function createLogger() {
  return pino({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    base: {
      service: "taps"
    }
  });
}
