# Stripe Sandbox Setup

Use this when you want the guest payment page to run a real Stripe test-mode card flow instead of the mock payment path.

## 1. Create or open a Stripe test account

1. Sign in to the Stripe Dashboard.
2. Enable test mode in the dashboard.
3. Copy these values:
   - publishable key
   - secret key

Official references:

- [Stripe test mode](https://docs.stripe.com/testing)
- [Accept a payment with Elements](https://docs.stripe.com/payments/accept-a-payment?api-integration=paymentintents&payment-ui=elements)

## 2. Fill local env vars

Set these in `.env`:

```env
DATA_STORE_DRIVER=postgres
QUEUE_DRIVER=memory
POS_PROVIDER_MODE=memory
PAYMENT_PROVIDER_MODE=stripe

NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_API_VERSION=
```

Notes:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is for the guest web app.
- `STRIPE_PUBLISHABLE_KEY` is kept for server-side runtime parity and documentation, even though Stripe.js uses the `NEXT_PUBLIC_` value.
- `STRIPE_API_VERSION` is optional. Leave it blank to use the account default unless you want to pin a specific Stripe API version deliberately.

## 3. Install and start the apps

```powershell
corepack enable
pnpm install
pnpm db:migrate
pnpm seed
pnpm --filter @taps/api dev
pnpm --filter @taps/customer-web dev
pnpm workers
```

Open the guest flow at:

- `http://localhost:3000/tap/demo-table-12`

## 4. Start webhook delivery

Choose one local webhook option.

### Option A: Stripe CLI

1. Install the Stripe CLI.
2. Authenticate it with your Stripe account.
3. Forward Stripe events to the local API:

```powershell
stripe listen --forward-to http://localhost:4000/webhooks/stripe
```

4. Copy the `whsec_...` value that Stripe CLI prints and place it in `STRIPE_WEBHOOK_SECRET`.

Official reference:

- [Stripe webhook local testing](https://docs.stripe.com/webhooks/test)

### Option B: ngrok

1. Start a public tunnel to the API:

```powershell
ngrok http 4000
```

2. In the Stripe Dashboard, add a webhook endpoint:

- URL: `https://YOUR-NGROK-DOMAIN.ngrok-free.app/webhooks/stripe`
- Events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

3. Copy the webhook signing secret from Stripe and set `STRIPE_WEBHOOK_SECRET`.

## 5. Use Stripe test cards

Working success card:

- `4242 4242 4242 4242`
- any future expiry
- any 3-digit CVC
- any ZIP

Failure card:

- `4000 0000 0000 9995`

Official reference:

- [Stripe testing cards](https://docs.stripe.com/testing?testing-method=card-numbers)

## 6. Expected flow

1. Tap `demo-table-12`.
2. Build a split.
3. Open Pay.
4. Click the payment CTA to create a Stripe PaymentIntent.
5. Enter a Stripe test card in the embedded Stripe form.
6. Stripe confirms the card client-side.
7. Taps captures the manual-capture PaymentIntent on the backend.
8. The API reconciles the payment attempt and updates table remaining balance.
9. If Stripe sends `payment_intent.succeeded`, the webhook idempotently reconciles the same payment attempt.

## 7. Current Stripe scope in this repo

Implemented now:

- real Stripe test-mode PaymentIntent creation
- client-side confirmation through Stripe.js
- backend capture through the payment provider abstraction
- webhook verification for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- durable payment-attempt reconciliation against Postgres-backed repositories
- mock payment fallback when `PAYMENT_PROVIDER_MODE=mock`

Still intentionally deferred:

- refunds UI
- saved cards
- live-mode launch checklist
- cancellation of stale authorized PaymentIntents when a bill version changes after client confirmation
