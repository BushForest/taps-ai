import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
};

export default withSentryConfig(nextConfig, {
  org: "tapseats",
  project: "taps-onboarding",
  hideSourceMaps: true,
  tunnelRoute: "/monitoring",
  silent: true,
});
