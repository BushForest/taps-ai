# Demo Runbook

## Recommended Local Mode

Use Postgres demo mode for the cleanest vertical slice:

- `DATA_STORE_DRIVER=postgres`
- `QUEUE_DRIVER=memory`
- `POS_PROVIDER_MODE=memory`
- `PAYMENT_PROVIDER_MODE=mock`

This keeps session, check, payment, loyalty, and exception data durable while avoiding sandbox credential requirements during the demo.

## Startup Sequence

1. `corepack enable`
2. `pnpm install`
3. Copy `.env.example` to `.env`
4. Set:
   - `DATA_STORE_DRIVER=postgres`
   - `QUEUE_DRIVER=memory`
   - `POS_PROVIDER_MODE=memory`
   - `PAYMENT_PROVIDER_MODE=mock`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
5. `pnpm db:migrate`
6. `pnpm seed`
7. `pnpm --filter @taps/api dev`
8. `pnpm --filter @taps/customer-web dev`
9. `pnpm --filter @taps/admin-web dev`
10. `pnpm workers`

## Guest Demo Path

1. Open the guest app at `http://localhost:3000`
2. Open `/tap/demo-table-12`
3. Confirm the session overview loads
4. Visit Menu
5. Visit Bill
6. Open Split and pick one:
   - even split
   - pay by item
   - custom amount
7. Continue to Pay and complete the mock payment
8. Optionally add a loyalty phone number
9. Visit Status to show:
   - payer complete
   - table not yet complete, if balance remains
   - table complete, once the balance reaches zero and close rules pass

## Admin Demo Path

1. Open the admin app at `http://localhost:3001`
2. Open `/restaurants/rest_demo`
3. Show restaurant overview cards
4. Open Sessions
5. Open the active session detail page
6. Inspect:
   - check snapshot
   - payment attempts
   - loyalty attachment state
   - open reconciliation exceptions
7. Use Clear Table to demonstrate immediate public lock behavior

## Sandbox Prep Notes

### Stripe

- Endpoint: `POST {API_BASE_URL}/webhooks/stripe`
- Raw request body verification is wired.
- The backend can create, retrieve, capture, and reconcile Stripe PaymentIntents.
- The guest web app can confirm a real Stripe test card through Stripe.js when `PAYMENT_PROVIDER_MODE=stripe`.
- Use the dedicated setup guide for exact sandbox steps:
  - [stripe_sandbox_setup.md](C:/Users/AP/Desktop/Taps_AI/docs/stripe_sandbox_setup.md)

### Square

- Endpoint: `POST {API_BASE_URL}/webhooks/square`
- Catalog fetch, order fetch, order create, external payment attach, and closed-check detection are wired.
- Current assumptions:
  - Taps-created or Taps-identifiable Square orders
  - zero-tip external payment attach path
- Remaining work for merchant sandbox signoff:
  - confirm order lookup strategy for staff-created checks
  - confirm external payment semantics per restaurant account
  - map tips into Square service charges before writeback
