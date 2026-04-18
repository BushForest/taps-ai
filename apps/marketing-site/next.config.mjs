import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "tapseats",
  project: "taps-marketing-site",
  hideSourceMaps: true,
  tunnelRoute: "/monitoring",
  silent: true,
});
