# Taps

Taps is a tableside restaurant platform that sits on top of an existing POS. The current repo supports a demo-ready vertical slice across NFC session creation, guest bill review, split allocation, payment orchestration, loyalty phone capture, session close/expiry behavior, and admin ops visibility.

## Repo Layout

- `docs/`: product, architecture, domain, edge-case, and roadmap docs
- `apps/api`: Fastify API, webhooks, workers, and agent orchestration
- `apps/customer-web`: guest-facing Next.js application
- `apps/admin-web`: restaurant/admin Next.js application
- `packages/contracts`: shared DTOs and MCP contracts
- `packages/domain`: domain helpers, state machines, and invariants
- `packages/mcp`: provider runtime and adapters
- `packages/db`: Drizzle schema and migrations
- `packages/config`: environment loading
- `packages/observability`: logging and tracing helpers
- `packages/testing`: fixtures and builders for tests
- `infra/`: docker and infrastructure assets
- `scripts/`: seed and local developer scripts
- `tests/`: unit, integration, contract, concurrency, and reconciliation tests

## Modes

- `mock mode`: `PAYMENT_PROVIDER_MODE=mock`, `POS_PROVIDER_MODE=memory`, `QUEUE_DRIVER=memory`, `DATA_STORE_DRIVER=memory`. Fastest path for UI iteration and the simplest end-to-end demo fallback.
- `postgres demo mode`: `DATA_STORE_DRIVER=postgres`, `QUEUE_DRIVER=memory`, `PAYMENT_PROVIDER_MODE=mock`, `POS_PROVIDER_MODE=memory`. Recommended local demo path because sessions, checks, payments, loyalty, and exceptions persist durably.
- `sandbox prep mode`: `DATA_STORE_DRIVER=postgres`, `QUEUE_DRIVER=bullmq`, `PAYMENT_PROVIDER_MODE=stripe`, `POS_PROVIDER_MODE=square`. Stripe test-mode checkout, backend capture, and webhook verification are wired. Square sandbox still needs merchant-specific account setup and order/tip validation.

## Local Setup

1. `corepack enable`
2. `pnpm install`
3. Copy `.env.example` to `.env` and fill the values for the mode you want.
4. For Postgres demo mode, run `pnpm db:migrate` and `pnpm seed`.
5. Start the backend with `pnpm --filter @taps/api dev`.
6. Start the guest app with `pnpm --filter @taps/customer-web dev`.
7. Start the admin app with `pnpm --filter @taps/admin-web dev`.
8. Start workers with `pnpm workers`.

### Frontend URLs

- Guest app: [http://localhost:3000](http://localhost:3000)
- Admin app: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:4000](http://localhost:4000)

## Demo Runbook

### Demo scenario

1. Open the guest app at [http://localhost:3000](http://localhost:3000).
2. Click the demo NFC shortcut or open `/tap/demo-table-12`.
3. Review the session overview, menu, and bill pages.
4. Go to Split and choose one of:
   - even split
   - pay by item
   - custom amount
5. Continue to Pay and complete the mock payment flow.
6. Optionally attach a loyalty phone number on the loyalty step.
7. Open the status page to confirm the distinction between:
   - your payment complete
   - table fully settled
8. Open the admin app and inspect:
   - restaurant overview
   - session detail
   - payment attempts
   - open reconciliation exceptions
   - clear/close actions

### Demo data

- Demo restaurant: `rest_demo`
- Demo NFC tag: `demo-table-12`
- Demo table: `table_12`

## Commands

- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm db:migrate`
- `pnpm seed`
- `pnpm workers`

`pnpm test` now runs package-level tests plus the root `tests/` integration/contract suite.

## Env Reference

### Core runtime

- `NODE_ENV`
- `PORT`
- `API_BASE_URL`
- `PUBLIC_BASE_URL`
- `ADMIN_BASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Persistence and queue

- `DATA_STORE_DRIVER`
- `DATABASE_URL`
- `QUEUE_DRIVER`
- `REDIS_URL`

### Provider selection

- `POS_PROVIDER_MODE`
- `PAYMENT_PROVIDER_MODE`

### Stripe sandbox

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_VERSION`

### Square sandbox

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`

## Sandbox Notes

### Stripe

- The Stripe provider now creates manual-capture PaymentIntents through the MCP boundary, supports provider-intent lookup, and verifies webhook signatures with the raw request body.
- The guest pay screen can confirm a real Stripe test-mode card payment through Stripe.js and then finalize capture through the existing backend payment path.
- Webhook events supported now:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Webhook endpoint: `POST {API_BASE_URL}/webhooks/stripe`
- Setup runbook: [docs/stripe_sandbox_setup.md](C:/Users/AP/Desktop/Taps_AI/docs/stripe_sandbox_setup.md)

### Square

- The Square adapter now includes catalog fetch, order lookup, order creation, external payment attach, closed-state detection, and webhook signature verification.
- The current writeback path is designed around Taps-owned Square orders and zero-tip external payment attachment.
- Tip writeback for Square still needs merchant-specific service-charge mapping before sandbox signoff.
- Webhook endpoint: `POST {API_BASE_URL}/webhooks/square`

## Current Constraints

- The critical session/payment path is durable in Postgres mode.
- Memory queue mode can process session expiry/archive and payment reconciliation jobs locally.
- BullMQ worker startup is scaffolded and env-driven, but needs Redis running and the `bullmq` dependencies installed.
- Square sandbox support is close for order/check flows, but still needs merchant account validation around external payment semantics and tips.
- Stripe sandbox support is ready for test-mode card confirmation, but still needs real local keys, a webhook tunnel or Stripe CLI forwarder, and production refund/cancel flows before launch.

## Source Of Truth Docs

- [project_scope.md](C:/Users/AP/Desktop/Taps_AI/docs/project_scope.md)
- [functional_spec.md](C:/Users/AP/Desktop/Taps_AI/docs/functional_spec.md)
- [architecture.md](C:/Users/AP/Desktop/Taps_AI/docs/architecture.md)
- [domain_model.md](C:/Users/AP/Desktop/Taps_AI/docs/domain_model.md)
- [edge_case_matrix.md](C:/Users/AP/Desktop/Taps_AI/docs/edge_case_matrix.md)
- [execution_plan.md](C:/Users/AP/Desktop/Taps_AI/docs/execution_plan.md)
- [demo_runbook.md](C:/Users/AP/Desktop/Taps_AI/docs/demo_runbook.md)
- [stripe_sandbox_setup.md](C:/Users/AP/Desktop/Taps_AI/docs/stripe_sandbox_setup.md)
