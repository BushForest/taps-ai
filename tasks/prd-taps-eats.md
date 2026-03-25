# PRD: TAPs Eats — NFC Tableside Commerce Platform

## Introduction

TAPs Eats is an NFC-triggered tableside commerce platform for upscale restaurants. A diner taps their phone on the NFC tag at the table, lands on the customer PWA (no app install), browses the menu, tracks their live bill, splits and pays their share, and requests a server — all without waiting. Staff use a separate admin PWA to monitor table states, review sessions, and manage exceptions.

The platform runs as a monorepo (`apps/customer-web`, `apps/admin-web`) on Next.js 15 App Router + TypeScript. Payments flow through a multi-vendor adapter (Stripe Connect primary, Square and others pluggable). Each feature is a self-contained subroutine that the restaurant can enable/disable from the admin dashboard.

Design reference: `C:\Users\AP\AppData\Local\Programs\Pencil\tapseat.pen`

---

## Goals

- Guests tap NFC → browse menu → view live bill → pay their share in under 60 seconds, zero app install
- Restaurant receives funds directly via Stripe Connect (or Square)
- Auth only required at payment; phone OTP or email, receipt sent to that contact
- Admin can toggle any feature module on/off without code change
- Multi-vendor payment support: Stripe Connect, Square, extensible to others via adapter
- Each feature is a separate subroutine — individually testable, individually deployable
- Dark steakhouse aesthetic: `#0e0e0e` bg, `#1a1a1a` cards, `#111111` header/nav, `#c9a96e` gold accent, Inter font

---

## User Stories

### US-001: NFC Session Entry
**Description:** As a diner, I want to tap my phone on the NFC tag and land on the live table session so I can immediately see the menu and bill.

**Acceptance Criteria:**
- [ ] NFC tag URL format: `taps.blackblue.ca/session/{publicToken}`
- [ ] Page loads without requiring auth or app install
- [ ] Session context (tableId, restaurantId) resolved from publicToken via API
- [ ] If session expired or invalid, show clear error with restaurant contact
- [ ] Typecheck passes

---

### US-002: Menu Browser — Category Pills + Item Grid
**Description:** As a diner, I want to browse the menu by category with item photos and prices.

**Acceptance Criteria:**
- [ ] Category pills: Full Menu, Steaks & Mains, Starters, Cocktails, Desserts (from API)
- [ ] Active pill highlighted in gold (`#c9a96e`)
- [ ] 2-column grid of item cards: photo (Unsplash fallback by item keyword), name, price
- [ ] Sold-out items show badge and are non-tappable
- [ ] Cart badge on header showing item count
- [ ] "Send to Kitchen" gold pill bottom bar visible when cart > 0
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-003: Item Detail / Expanded View
**Description:** As a diner, I want to expand an item to see full details, choose options, and add to my order.

**Acceptance Criteria:**
- [ ] Full-bleed hero image for item
- [ ] Doneness pills (Rare/Med-Rare/Medium/Well) for steak items
- [ ] Sauce/side pills for applicable items
- [ ] Notes free-text field
- [ ] Allergen chips (Gluten/Dairy/Shellfish/Nuts/Eggs) — filled if item contains
- [ ] Quantity +/- selector, minimum 1
- [ ] "Add to Order" gold CTA adds item to cart
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-004: Cart + Kitchen Confirm Bottom Sheet
**Description:** As a diner, I want to review my cart before sending to the kitchen.

**Acceptance Criteria:**
- [ ] Bottom sheet slides up showing PENDING ORDER list
- [ ] Each item: name, quantity, price, options
- [ ] "Send to Kitchen" gold CTA submits order to API
- [ ] "Keep Browsing" dismisses sheet without submitting
- [ ] After submit: optimistic success state, cart cleared
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Live Bill Tab
**Description:** As a diner, I want to see the live running tab for the whole table, including what's in the kitchen vs on the table.

**Acceptance Criteria:**
- [ ] Summary bar: total outstanding, my share
- [ ] IN KITCHEN section: items submitted, not yet delivered
- [ ] ON TABLE section: items delivered, awaiting payment
- [ ] Each item: name, price, who ordered (avatar initial)
- [ ] "Pay Your Share" gold CTA links to Pay tab
- [ ] Real-time update every 30s (polling)
- [ ] Help FAB for request-server flow
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-006: Pay Tab — Split Evenly
**Description:** As a diner, I want to split the bill evenly with others at the table.

**Acceptance Criteria:**
- [ ] MY TAB balance card at top with remaining amount
- [ ] "Split Evenly" expandable section: people picker (2–10), per-person amount shown in gold
- [ ] Selected split method has gold border + SELECTED pill
- [ ] Tip selector: 15% / 18% / 20% / Custom (with dollar input field)
- [ ] Wallet buttons: Apple Pay / Google Pay / Samsung Pay (conditionally shown by device)
- [ ] Pay CTA: "Pay $XX.XX · Split Evenly" — reflects current selection
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-007: Pay Tab — Pay for My Items
**Description:** As a diner, I want to pay only for the items assigned to me.

**Acceptance Criteria:**
- [ ] "Pay for My Items" expandable section listing my assigned items
- [ ] Each item: name, price
- [ ] My subtotal + tip = total
- [ ] Same tip selector and wallet buttons as US-006
- [ ] Pay CTA: "Pay $XX.XX · My Items"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-008: Pay Tab — Custom Amount
**Description:** As a diner, I want to enter a custom dollar amount to pay.

**Acceptance Criteria:**
- [ ] "Custom Amount" expandable section with numeric input
- [ ] Input capped at remaining table balance
- [ ] Tip applied on top of custom amount
- [ ] Pay CTA: "Pay $XX.XX · Custom"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-009: Pay Whole Tab
**Description:** As a diner (host), I want to pay the entire remaining table balance at once.

**Acceptance Criteria:**
- [ ] "Pay Whole Tab" option on Pay tab or separate accessible route
- [ ] Shows full remaining balance
- [ ] Same tip + wallet flow as above
- [ ] Pay CTA: "Pay $XX.XX · Full Tab"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-010: Auth at Payment — Phone OTP
**Description:** As a diner, I want to authenticate with my phone number before paying so my receipt goes there.

**Acceptance Criteria:**
- [ ] Auth gate triggered when diner taps any Pay CTA
- [ ] Phone number input with country code selector
- [ ] OTP sent via Twilio SMS
- [ ] 6-digit OTP input, resend after 60s countdown
- [ ] On success: payment proceeds, session associated with phone
- [ ] Receipt sent as SMS to that number after payment
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-011: Auth at Payment — Email
**Description:** As a diner, I want to authenticate with my email before paying so my receipt goes there.

**Acceptance Criteria:**
- [ ] Email + password option on sign-in sheet
- [ ] Create account link to `/signup`
- [ ] On success: payment proceeds, receipt emailed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Auth at Payment — Social + Guest
**Description:** As a diner, I want to sign in with Google or Apple, or continue as a guest.

**Acceptance Criteria:**
- [ ] Google OAuth button
- [ ] Apple Sign-In button
- [ ] "Continue as Guest" — no persistent account, receipt sent to entered email post-payment
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Request Server
**Description:** As a diner, I want to request assistance from a server without leaving my seat.

**Acceptance Criteria:**
- [ ] Quick-request tiles: Water / Utensils / Ice / Refill / Other
- [ ] "Other" expands free-text field
- [ ] Server availability status indicator (available/busy)
- [ ] "Send Request" submits to API, creates request record on admin side
- [ ] Success confirmation state after submit
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Guest Profile
**Description:** As a returning diner, I want to manage my profile, payment methods, and preferences.

**Acceptance Criteria:**
- [ ] Avatar with initials or uploaded photo
- [ ] Gold Member badge if loyalty tier reached
- [ ] Edit Profile, Payment Methods, Order History, Preferences, Settings, Notifications, Sign Out
- [ ] Order History: list of past sessions with total and date
- [ ] Sign Out clears session
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-015: Admin — Floor View Dashboard
**Description:** As a restaurant worker, I want a live view of all tables with their current state so I can manage the floor efficiently.

**Acceptance Criteria:**
- [ ] Table grid: each card shows tableId, status color, guest count, time active, outstanding balance
- [ ] Table state colors: Available (grey), Just Seated (blue), Eating (green), About to Pay (amber), Assistance Requested (red/alarm pulse)
- [ ] Stat bar: active tables, total outstanding, alert count
- [ ] "Mark Served" CTA on each card
- [ ] "Clear Table" CTA on completed tables
- [ ] Auto-refresh every 30s
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-016: Admin — Sessions List
**Description:** As a restaurant worker, I want to see all active and recent sessions with their details.

**Acceptance Criteria:**
- [ ] List: tableId, sessionId, check version, status pill, remaining balance, payers done/total
- [ ] Click row expands to show line items and payer breakdown
- [ ] Filter by status (active / completed / exception)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-017: Admin — Exceptions List
**Description:** As a restaurant worker, I want to see flagged sessions with unpaid items or assignment gaps.

**Acceptance Criteria:**
- [ ] Exceptions: unassigned line items, close-validation failures
- [ ] Each exception: severity, description, session link
- [ ] "Resolve" action marks exception handled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-018: Admin — Feature Flag Dashboard
**Description:** As a restaurant manager, I want to toggle feature modules on/off from the admin UI without code changes.

**Acceptance Criteria:**
- [ ] Feature flag list with toggle switches: Menu Ordering, Live Bill, Pay Tab, Request Server, Loyalty, Kitchen Confirm, Phone OTP, Email Auth, Social Auth, Guest Checkout, Apple Pay, Google Pay, Samsung Pay
- [ ] Each toggle persists to DB, takes effect within 30s on customer PWA
- [ ] Toggle shows current state (ON/OFF) with last-changed-by and timestamp
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-019: Payment Processing — Stripe Connect
**Description:** As the system, I want to process payments through Stripe Connect so the restaurant receives funds directly.

**Acceptance Criteria:**
- [ ] Stripe Connect onboarding flow for restaurant account setup
- [ ] Payment Intent created server-side with `transfer_data.destination` = restaurant Stripe account
- [ ] Platform fee deducted as `application_fee_amount`
- [ ] Webhook handler: `payment_intent.succeeded` → mark payer complete, send receipt
- [ ] Idempotency keys on all payment requests
- [ ] Typecheck passes

---

### US-020: Payment Adapter — Square
**Description:** As the system, I want to support Square as an alternative payment processor.

**Acceptance Criteria:**
- [ ] `PaymentAdapter` interface: `createPaymentIntent(params)`, `confirmPayment(id)`, `refund(id, amount)`, `getStatus(id)`
- [ ] `StripeAdapter` implements `PaymentAdapter`
- [ ] `SquareAdapter` implements `PaymentAdapter` using Square Payments API
- [ ] Active adapter selected by `PAYMENT_PROVIDER` env var (`stripe` | `square`)
- [ ] Unit tests for both adapters
- [ ] Typecheck passes

---

### US-021: Receipt Delivery
**Description:** As a diner, I want to receive a receipt after paying.

**Acceptance Criteria:**
- [ ] Receipt triggered by `payment_intent.succeeded` webhook
- [ ] If auth was phone OTP: SMS receipt via Twilio (itemized, tip, total, restaurant name)
- [ ] If auth was email: email receipt via Resend/SendGrid (HTML template, itemized)
- [ ] If guest checkout: receipt sent to email entered at payment
- [ ] Typecheck passes

---

### US-022: Modular Subroutine Architecture
**Description:** As a developer, I want each feature to be a self-contained module so I can enable, disable, test, and deploy features independently.

**Acceptance Criteria:**
- [ ] Each feature in `src/modules/{feature}/`: `index.ts`, `api.ts`, `ui.tsx`, `flags.ts`
- [ ] Feature flag check at module entry point — returns null/disabled state if off
- [ ] No inter-module imports except through a shared contracts package
- [ ] Each module has its own test file
- [ ] `admin-web` feature flag page reads from same flags source
- [ ] Typecheck passes

---

## Functional Requirements

**Session & Access**
- FR-1: Session resolved from publicToken; includes tableId, restaurantId, checkId
- FR-2: `publicAccessAllowed` flag gates check data visibility
- FR-3: Sessions expire after inactivity; expired sessions show graceful error

**Menu**
- FR-4: Menu loaded from `GET /api/menu/{restaurantId}` — returns categories + items with basePriceCents, description, availability, categoryId
- FR-5: Availability states: `available`, `sold_out`, `hidden` (hidden items never shown)
- FR-6: Item images resolved by keyword matching against Unsplash library; fallback to category emoji

**Ordering**
- FR-7: Cart state managed client-side (localStorage) until "Send to Kitchen"
- FR-8: Kitchen submission: `POST /api/session/{token}/order` with line items + options
- FR-9: Item options (doneness, sauce, sides) attached as modifiers on order lines

**Bill**
- FR-10: Live bill fetched from `GET /api/session/{token}/check` — returns snapshot with lines, assignedCents, grossCents, subtotalCents, taxCents, feeCents, totalCents, amountPaidCents, remainingBalanceCents
- FR-11: Lines include assignmentStatus: `unassigned`, `partially_assigned`, `fully_assigned`
- FR-12: Payers list on check: displayName, status (ordering/completed/left), assignedLines

**Payment**
- FR-13: Payment Intent created server-side; client uses Stripe.js or Square Web Payments SDK
- FR-14: Split Evenly: amount = remainingBalance / N (rounded up to nearest cent, remainder on last person)
- FR-15: Pay My Items: amount = sum of lines assigned to this payer
- FR-16: Custom Amount: any value ≤ remainingBalance
- FR-17: Tip calculated on subtotal before tax+fees; stored separately on PaymentRecord
- FR-18: After payment confirmed: payer status → `completed`, remainingBalance updated

**Auth**
- FR-19: Auth gate modal shown before any payment flow
- FR-20: Phone OTP: Twilio Verify service, 10-minute expiry
- FR-21: JWT issued after auth; stored in httpOnly cookie, 24hr expiry
- FR-22: Guest checkout: no persistent account; contact stored only for receipt delivery

**Admin**
- FR-23: Floor View polling interval: 30s
- FR-24: Table state derived from session + check state (no separate state machine)
- FR-25: Assistance Requested state: triggered by Request Server submission
- FR-26: Feature flags stored in `restaurant_settings.feature_flags` JSON column
- FR-27: Flag changes propagate to customer PWA via 30s polling or WebSocket push

**Receipts**
- FR-28: Receipt payload: restaurant name, table, date, itemized list, subtotal, tax, fees, tip, total, last-4 of payment method

---

## Non-Goals

- Native iOS/Android apps (PWA only)
- Table reservation / waitlist management
- Staff POS integration (admin is read/monitor only, not a POS)
- Kitchen Display System (KDS) screen
- Loyalty points accumulation logic (badge display only)
- Multi-location management (single-restaurant scope for v1)
- Real-time WebSocket updates (polling is acceptable for v1)
- Offline mode

---

## Design Considerations

**Design tokens (all from tapseat.pen):**
- Background: `#0e0e0e`
- Cards: `#1a1a1a`
- Header/Nav: `#111111`
- Gold accent: `#c9a96e`
- Gold deep: `#a07840`
- Muted text: `#888888`
- Font: Inter (400/600/700/800 weights)
- Border radius: 14px cards, 20px pills, 8px inputs
- Bottom nav height: 87px (safe area aware)

**Component library (customer-web):**
- `SessionShell` — page wrapper with 3-tab nav (Menu | Live Bill | Pay)
- `MenuPreview` — category pills + 2-col item grid
- `ItemDetailModal` — full-screen item detail with options
- `KitchenConfirmSheet` — bottom sheet order review
- `LiveBillView` — IN KITCHEN / ON TABLE sections
- `PayTab` — split method selector + tip + wallet + CTA
- `SignInModal` — phone OTP / email / social / guest tabs
- `RequestServerSheet` — quick tile + notes
- `ProfilePage` — avatar, settings, order history

**Component library (admin-web):**
- `FloorView` — table grid with state colors
- `SessionList` — filterable session table
- `ExceptionsList` — flagged sessions
- `FeatureFlagDashboard` — toggle panel per feature module
- `StatBar` — active/outstanding/alerts

---

## Technical Considerations

**Monorepo structure:**
```
apps/
  customer-web/     # Next.js 15, customer PWA
  admin-web/        # Next.js 15, admin PWA
packages/
  contracts/        # Shared TypeScript types
  ui/               # Shared design tokens + base components
  payment-adapters/ # PaymentAdapter interface + Stripe + Square impls
```

**Payment adapter interface:**
```typescript
interface PaymentAdapter {
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>
  confirmPayment(intentId: string, methodId: string): Promise<PaymentResult>
  refund(intentId: string, amountCents: number): Promise<RefundResult>
  getStatus(intentId: string): Promise<PaymentStatus>
}
```

**Feature flag module pattern:**
```typescript
// src/modules/menu-ordering/flags.ts
export const FLAGS = {
  MENU_ORDERING: 'menu_ordering',
  KITCHEN_SUBMIT: 'kitchen_submit',
} as const

// src/modules/menu-ordering/index.ts
export async function MenuOrderingModule(props) {
  const flags = await getFeatureFlags(props.restaurantId)
  if (!flags.menu_ordering) return <FeatureDisabled name="Menu Ordering" />
  return <MenuOrderingUI {...props} />
}
```

**Auth flow:**
1. Diner taps Pay CTA
2. `useAuthGate()` hook checks JWT cookie
3. If not authenticated → `SignInModal` shown
4. On OTP success → `POST /api/auth/verify-otp` → JWT issued → modal dismissed → payment proceeds
5. Contact stored in `session_payers.contact_info` for receipt routing

**Environment variables required:**
```
# Payment
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
SQUARE_ACCESS_TOKEN          # optional, if PAYMENT_PROVIDER=square
PAYMENT_PROVIDER=stripe      # stripe | square

# Auth
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
JWT_SECRET

# Receipts
RESEND_API_KEY               # or SENDGRID_API_KEY
RECEIPT_FROM_EMAIL

# App
NEXT_PUBLIC_API_BASE_URL
DATABASE_URL
```

**Database tables (additions/changes needed):**
- `restaurants` — id, name, stripe_connect_account_id, square_merchant_id, payment_provider
- `restaurant_settings` — restaurant_id, feature_flags JSONB
- `sessions` — id, public_token, table_id, restaurant_id, status, created_at
- `session_payers` — id, session_id, display_name, contact_info, contact_type (phone/email), status
- `payment_records` — id, session_id, payer_id, amount_cents, tip_cents, provider, provider_payment_id, status, created_at
- `server_requests` — id, session_id, request_type, notes, status, created_at

---

## Success Metrics

- Diner can tap NFC → complete payment in < 60 seconds
- Restaurant admin can toggle any feature in < 3 taps
- Zero payment failures due to adapter errors (idempotency + retry)
- Receipt delivery < 10s after payment confirmed
- Admin floor view accurately reflects table state within 30s

---

## Open Questions

- Should ordering (Send to Kitchen) require auth, or only payment requires auth?
- Should the platform fee percentage be configurable per-restaurant or fixed?
- Should "Pay Whole Tab" require elevated auth (e.g., the seat who opened the session)?
- WebSocket vs polling for real-time bill updates — polling for v1 is acceptable?
- Should item assignment (who pays for what) be diner-driven or server-driven?
