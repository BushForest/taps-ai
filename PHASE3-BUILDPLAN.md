# TAPs Eats — Phase 3: Build Plan
> Derived from PHASE1-SPEC.md (28 screens) and PHASE2-ARCHITECTURE.md.
> Checklist format. Every screen, component, schema entity, and API route listed.
> Build order respects dependencies: schema → API → shared → customer → admin.

---

## Folder Structure

### `packages/contracts/`
```
src/
├── restaurant.ts        # Restaurant, ModuleConfig types
├── table.ts             # Table, TableStatus types
├── session.ts           # Session, SessionStatus types
├── check.ts             # Check, LineItem, Modifier, LineStatus types
├── payer.ts             # Payer type
├── customer.ts          # Customer, NotificationPrefs types
├── payment.ts           # Payment, SplitType, PaymentMethod types
├── exception.ts         # Exception type
├── server-request.ts    # ServerRequest type
├── adjustment.ts        # BillAdjustment type
├── flag.ts              # IssueFlag type
├── promo.ts             # Promo type
├── order-history.ts     # OrderHistoryEntry type
└── index.ts             # re-exports all
```

### `packages/ui/`
```
src/
├── tokens/
│   ├── colors.ts        # --color-* tokens
│   ├── typography.ts    # font family, weights
│   └── index.ts
├── components/
│   ├── GoldButton.tsx
│   ├── OutlineButton.tsx
│   ├── TextLink.tsx
│   ├── SectionLabel.tsx
│   ├── ToggleSwitch.tsx
│   ├── ChipPill.tsx
│   ├── AvatarCircle.tsx
│   ├── StatusBadge.tsx
│   ├── AdminBadge.tsx
│   ├── CardSurface.tsx
│   └── CheckboxRow.tsx
└── index.ts
```

### `apps/customer-web/` (Next.js 15 App Router)
```
src/
├── app/
│   └── s/
│       └── [token]/
│           ├── layout.tsx               # session shell: header + 3-tab nav
│           ├── page.tsx                 # → redirect to /menu
│           ├── menu/
│           │   ├── page.tsx             # QyeVt — Menu Tab
│           │   └── [itemId]/
│           │       └── page.tsx         # i8cYK — Item Expanded
│           ├── kitchen-confirm/
│           │   └── page.tsx             # 7AoYl — Kitchen Confirm
│           ├── bill/
│           │   └── page.tsx             # 1B29b — Live Bill
│           ├── pay/
│           │   ├── page.tsx             # uWSAa — Pay Tab (Split Evenly default)
│           │   └── whole/
│           │       └── page.tsx         # Ljq8D — Pay Whole Tab
│           ├── signin/
│           │   └── page.tsx             # SSrbr — Sign In
│           ├── server/
│           │   └── page.tsx             # xFqLF — Request Server
│           └── profile/
│               ├── page.tsx             # VBVOc — Profile
│               ├── edit/
│               │   └── page.tsx         # RU9cE — Edit Profile
│               ├── payment-methods/
│               │   └── page.tsx         # KfO5H — Payment Methods
│               ├── orders/
│               │   └── page.tsx         # QuuQx — Order History
│               ├── preferences/
│               │   └── page.tsx         # Jg1eR — Preferences
│               └── settings/
│                   └── page.tsx         # lNkeD — Settings
├── components/
│   ├── session-shell.tsx        # header + tab nav wrapper
│   ├── menu-item-card.tsx       # item card in menu list
│   ├── allergen-chip.tsx        # GF, DF chip
│   ├── cart-bar.tsx             # "Send to Kitchen (N)" bottom bar
│   ├── bill-line-item.tsx       # line in Live Bill
│   ├── payment-option-card.tsx  # accordion card in Pay Tab
│   ├── tip-selector.tsx         # 15/18/20/Custom pill row
│   ├── exception-card.tsx       # (shared with admin web)
│   └── profile-list-row.tsx     # row with right arrow
└── lib/
    ├── api-client.ts            # fetch wrappers
    ├── session.ts               # session token helpers
    └── format.ts                # currency, date formatters
```

### `apps/admin-mobile/` (Expo React Native — NEW)
```
src/
├── app/
│   ├── _layout.tsx              # root: auth gate + 4-tab nav
│   ├── (tabs)/
│   │   ├── floor/
│   │   │   └── index.tsx        # aTOvy — Floor View
│   │   ├── sessions/
│   │   │   ├── index.tsx        # mfayM — Sessions
│   │   │   └── [sessionId]/
│   │   │       ├── index.tsx    # hBI3e — Table Detail
│   │   │       ├── edit.tsx     # QxOvz — Edit Order
│   │   │       ├── adjust.tsx   # u4SRA — Adjust Bill
│   │   │       └── flag.tsx     # hbtHG — Flag Issue
│   │   ├── exceptions/
│   │   │   └── index.tsx        # 6nP4C — Exceptions
│   │   └── analytics/
│   │       ├── index.tsx        # z96aY — Analytics
│   │       ├── item-pairings.tsx    # Byc4P — Item Pairings
│   │       ├── issues.tsx           # FXL56 — Issues & Adjustments
│   │       ├── kitchen.tsx          # Ivgvf — Kitchen & Ops
│   │       ├── revenue.tsx          # Z0r16 — Revenue Deep Dive
│   │       ├── customers.tsx        # YlHpL — Repeat Customers
│   │       └── promos.tsx           # 8QYCz — Promo Assignment
├── components/
│   ├── table-card.tsx           # floor view table card
│   ├── session-card.tsx         # sessions list card
│   ├── exception-card.tsx       # exception card
│   ├── line-item-row.tsx        # order line item
│   ├── adjustment-reason-tile.tsx
│   ├── issue-type-tile.tsx
│   ├── kpi-cell.tsx             # analytics KPI card
│   ├── bar-chart.tsx            # weekly revenue chart
│   ├── ranked-list-row.tsx      # top items row
│   ├── stat-pair-row.tsx        # label + value row
│   ├── customer-card.tsx        # repeat customer card
│   ├── promo-card.tsx           # active promo card
│   └── admin-nav-bar.tsx        # 4-tab bottom nav
└── lib/
    ├── api-client.ts
    ├── realtime.ts              # Supabase realtime subscriptions
    └── format.ts
```

### `apps/api/` (Hono, port 4000)
```
src/
├── routes/
│   ├── public/
│   │   └── session.ts           # POST /public/taps/:token/session
│   ├── customer/
│   │   ├── menu.ts              # GET /customer/menu
│   │   ├── order.ts             # POST /customer/order
│   │   ├── bill.ts              # GET /customer/bill
│   │   ├── payment.ts           # POST /customer/pay
│   │   ├── server-request.ts    # POST /customer/server-request
│   │   └── profile.ts           # GET/PATCH /customer/profile
│   └── admin/
│       ├── tables.ts            # GET /admin/tables
│       ├── sessions.ts          # GET/PATCH /admin/sessions
│       ├── orders.ts            # GET/PATCH /admin/orders
│       ├── adjustments.ts       # POST /admin/adjustments
│       ├── flags.ts             # POST /admin/flags
│       ├── exceptions.ts        # GET/PATCH /admin/exceptions
│       ├── analytics.ts         # GET /admin/analytics/*
│       ├── customers.ts         # GET /admin/customers
│       └── promos.ts            # GET/POST/PATCH /admin/promos
├── middleware/
│   ├── auth.ts                  # Supabase JWT validation
│   └── modules.ts               # per-restaurant module gate
└── db/
    └── supabase.ts              # Supabase client
```

---

## Schema Checklist

### Supabase Migrations (in dependency order)

- [ ] `restaurants` — id, name, modules (jsonb)
- [ ] `tables` — id, restaurant_id, number, status, nfc_token
- [ ] `customers` — id, first_name, last_name, email, phone, date_of_birth, tier
- [ ] `customer_dietary_preferences` — customer_id, preference
- [ ] `customer_notification_prefs` — customer_id, order_updates, promotions, server_notifications
- [ ] `customer_seating_preferences` — customer_id, preference
- [ ] `payment_methods` — id, customer_id, type, last4, expiry, is_default, is_connected
- [ ] `sessions` — id, table_id, restaurant_id, opened_at, status, assist_requested
- [ ] `payers` — id, session_id, customer_id (nullable), amount_paid_cents
- [ ] `checks` — id, session_id, total_cents, amount_paid_cents, remaining_balance_cents
- [ ] `line_items` — id, check_id, parent_line_id, name, gross_cents, quantity, status
- [ ] `modifiers` — id, line_item_id, type, value
- [ ] `payments` — id, session_id, payer_id, amount_cents, tip_cents, tip_percent, method, split_type, split_people_count
- [ ] `exceptions` — id, restaurant_id, session_id, type, severity, summary, description, status, detected_at, resolved_at, details (jsonb)
- [ ] `server_requests` — id, session_id, type, status, requested_at
- [ ] `bill_adjustments` — id, session_id, reason, credit_amount_cents, server_notes, requires_manager_approval, approved_by, submitted_at
- [ ] `bill_adjustment_lines` — adjustment_id, line_item_id
- [ ] `issue_flags` — id, session_id, type, priority, description, notify_manager, submitted_at
- [ ] `issue_flag_lines` — flag_id, line_item_id
- [ ] `promos` — id, restaurant_id, name, discount_type, amount, max_uses, used_count, start_date, end_date, status
- [ ] `order_history` — id, customer_id, session_id, date, total_cents, rating, table_number
- [ ] `order_history_items` — history_id, item_name

### RLS Policies
- [ ] All tables: `restaurant_id` scoped for staff roles
- [ ] `customers`, `payment_methods`: `customer_id` scoped for customer role
- [ ] `sessions`, `checks`, `line_items`: accessible by session token (public role)
- [ ] `bill_adjustments`: write requires manager role or `requires_manager_approval = false`

---

## Shared Components Checklist (`packages/ui/`)

- [ ] `GoldButton` — gold fill pill, full width variant + auto-width variant, disabled state
- [ ] `OutlineButton` — gold outline + gray outline variants
- [ ] `TextLink` — plain text, gold variant + gray variant
- [ ] `SectionLabel` — ALL CAPS, gray, with optional spacing
- [ ] `ToggleSwitch` — ON (gold) / OFF (gray) states
- [ ] `ChipPill` — selected (gold fill) / unselected (dark outline) states
- [ ] `AvatarCircle` — initials, colored background
- [ ] `StatusBadge` — table status colors: available / just_seated / eating / paying / assistance
- [ ] `AdminBadge` — gold `ADMIN` label
- [ ] `CardSurface` — `#1a1a1a` rounded card container
- [ ] `CheckboxRow` — checkbox + item name + price

---

## Screen Build Checklist

### Customer PWA — 14 Screens

| # | Frame | Screen | Status |
|---|-------|--------|--------|
| 01 | QyeVt | Menu Tab | [ ] |
| 02 | i8cYK | Item Expanded | [ ] |
| 03 | 7AoYl | Kitchen Confirm | [ ] |
| 04 | 1B29b | Live Bill | [ ] |
| 05 | uWSAa | Pay Tab | [ ] |
| 06 | Ljq8D | Pay Whole Tab | [ ] |
| 07 | SSrbr | Sign In | [ ] |
| 08 | xFqLF | Request Server | [ ] |
| 09 | VBVOc | Profile | [ ] |
| 10 | RU9cE | Edit Profile | [ ] |
| 11 | KfO5H | Payment Methods | [ ] |
| 12 | QuuQx | Order History | [ ] |
| 13 | Jg1eR | Preferences | [ ] |
| 14 | lNkeD | Settings | [ ] |

### Admin Mobile — 14 Screens

| # | Frame | Screen | Status |
|---|-------|--------|--------|
| 15 | aTOvy | Floor View | [ ] |
| 16 | mfayM | Sessions | [ ] |
| 17 | 6nP4C | Exceptions | [ ] |
| 18 | hBI3e | Table Detail | [ ] |
| 19 | QxOvz | Edit Order | [ ] |
| 20 | u4SRA | Adjust Bill | [ ] |
| 21 | z96aY | Analytics | [ ] |
| 22 | Byc4P | Item Pairings | [ ] |
| 23 | FXL56 | Issues & Adjustments | [ ] |
| 24 | Ivgvf | Kitchen & Ops | [ ] |
| 25 | Z0r16 | Revenue Deep Dive | [ ] |
| 26 | YlHpL | Repeat Customers | [ ] |
| 27 | hbtHG | Flag Issue | [ ] |
| 28 | 8QYCz | Promo Assignment | [ ] |

---

## API Route Checklist

### Public (no auth)
- [ ] `POST /public/taps/:token/session` — create or resume session from NFC token

### Customer (session-token auth)
- [ ] `GET  /customer/menu` — fetch menu items with allergens
- [ ] `GET  /customer/bill` — fetch current check + line items
- [ ] `POST /customer/order` — send items to kitchen
- [ ] `POST /customer/pay` — submit payment (amount, tip, method, split type)
- [ ] `POST /customer/server-request` — send quick request to staff
- [ ] `GET  /customer/profile` — fetch customer profile
- [ ] `PATCH /customer/profile` — update profile fields
- [ ] `GET  /customer/profile/orders` — fetch order history
- [ ] `GET  /customer/profile/payment-methods` — list saved cards + wallets
- [ ] `POST /customer/profile/payment-methods` — add new card
- [ ] `PATCH /customer/profile/payment-methods/:id` — set default
- [ ] `DELETE /customer/profile/payment-methods/:id` — remove card

### Admin (staff JWT auth)
- [ ] `GET  /admin/tables` — fetch all tables with current status
- [ ] `GET  /admin/sessions` — fetch sessions list with filters
- [ ] `GET  /admin/sessions/:id` — fetch session detail + check + payers
- [ ] `PATCH /admin/sessions/:id` — update session status (mark served, clear table)
- [ ] `GET  /admin/sessions/:id/order` — fetch line items for edit
- [ ] `PATCH /admin/sessions/:id/order` — save order edits
- [ ] `POST /admin/sessions/:id/adjust` — submit bill adjustment
- [ ] `POST /admin/sessions/:id/flag` — submit issue flag
- [ ] `GET  /admin/exceptions` — fetch exceptions list
- [ ] `PATCH /admin/exceptions/:id` — resolve / dismiss exception
- [ ] `GET  /admin/analytics` — fetch core KPIs
- [ ] `GET  /admin/analytics/item-pairings` — fetch pairing data
- [ ] `GET  /admin/analytics/issues` — fetch issues & adjustments data
- [ ] `GET  /admin/analytics/kitchen` — fetch kitchen & ops data
- [ ] `GET  /admin/analytics/revenue` — fetch revenue deep dive data
- [ ] `GET  /admin/customers` — fetch repeat customers list
- [ ] `GET  /admin/promos` — fetch promos list
- [ ] `POST /admin/promos` — create new promo
- [ ] `PATCH /admin/promos/:id` — edit promo

---

## Milestone Plan

### Milestone 0 — Foundation
**Goal:** Repo wired, DB running, auth working, shared types in place.

- [ ] Supabase project created, env vars set in all apps
- [ ] All schema migrations run (21 tables)
- [ ] RLS policies applied
- [ ] `packages/contracts` — all types exported
- [ ] `packages/ui` — all 11 shared components built and tested
- [ ] Customer auth: email+password, phone OTP, Apple, Google, guest
- [ ] Admin auth: email+password (restaurant-scoped)
- [ ] Module middleware wired in API

---

### Milestone 1 — Customer Core (Screens 01–06)
**Goal:** Customer can scan NFC → browse menu → order → see bill → pay.

- [ ] Screen 01: Menu Tab (QyeVt)
- [ ] Screen 02: Item Expanded (i8cYK) — doneness, sauce, notes, qty, allergens
- [ ] Screen 03: Kitchen Confirm (7AoYl)
- [ ] Screen 04: Live Bill (1B29b) — IN KITCHEN / ON TABLE sections, help FAB
- [ ] Screen 05: Pay Tab (uWSAa) — all 4 accordion options, tip selector, Apple/Google/Samsung Pay
- [ ] Screen 06: Pay Whole Tab (Ljq8D)
- [ ] Realtime: line item status updates (in_kitchen → on_table) on Live Bill
- [ ] API routes: menu, order, bill, pay

---

### Milestone 2 — Customer Auth & Profile (Screens 07–14)
**Goal:** Customer can sign in, view profile, manage preferences and payment methods.

- [ ] Screen 07: Sign In (SSrbr) — all 4 auth paths + guest
- [ ] Screen 08: Request Server (xFqLF) — quick request tiles, server availability status
- [ ] Screen 09: Profile (VBVOc) — avatar in header when signed in
- [ ] Screen 10: Edit Profile (RU9cE)
- [ ] Screen 11: Payment Methods (KfO5H)
- [ ] Screen 12: Order History (QuuQx)
- [ ] Screen 13: Preferences (Jg1eR) — dietary chips, allergies, notification toggles, seating
- [ ] Screen 14: Settings (lNkeD)
- [ ] API routes: profile, orders, payment-methods, server-request

---

### Milestone 3 — Admin Core (Screens 15–18)
**Goal:** Staff can view floor, manage sessions, see table detail.

- [ ] Expo project scaffolded (`apps/admin-mobile/`)
- [ ] 4-tab bottom nav wired (Floor, Sessions, Exceptions, Analytics)
- [ ] Screen 15: Floor View (aTOvy) — 3-column table grid, all 5 status colors, stat bar
- [ ] Screen 16: Sessions (mfayM) — filter pills, session cards, View Order / Clear Table
- [ ] Screen 17: Exceptions (6nP4C) — Critical / Warnings / Resolved Today sections, Live badge
- [ ] Screen 18: Table Detail (hBI3e) — status, stats, line items, totals, 3 action buttons
- [ ] Realtime: table status changes on Floor View
- [ ] Realtime: new exceptions on Exceptions tab badge
- [ ] API routes: tables, sessions, exceptions

---

### Milestone 4 — Admin Management (Screens 19–20, 27)
**Goal:** Staff can edit orders, adjust bills, flag issues.

- [ ] Screen 19: Edit Order (QxOvz) — search input, item cards with qty controls, totals, save
- [ ] Screen 20: Adjust Bill (u4SRA) — reason tiles, item checkboxes, notes, summary, manager toggle
- [ ] Screen 27: Flag Issue (hbtHG) — issue type tiles, priority, description, affected items, notify toggle
- [ ] API routes: order edit, adjustment, flag

---

### Milestone 5 — Admin Analytics (Screens 21–26, 28)
**Goal:** Manager can view all analytics dashboards and manage promos.

- [ ] Screen 21: Analytics (z96aY) — KPI grid, bar chart, top items, table performance
- [ ] Screen 22: Item Pairings (Byc4P) — top pairings list, upsell opportunities, Create Suggestion
- [ ] Screen 23: Issues & Adjustments (FXL56) — flagged issues ranked, adjustment breakdown, repeat offenders
- [ ] Screen 24: Kitchen & Ops (Ivgvf) — first fire times, peak kitchen load chart, dwell time, waste tracking
- [ ] Screen 25: Revenue Deep Dive (Z0r16) — breakdown by category, daypart, margin by item, weekly comparison
- [ ] Screen 26: Repeat Customers (YlHpL) — stats, search, filter pills, customer cards with VIP badges
- [ ] Screen 28: Promo Assignment (8QYCz) — create form, active promos, expired promos
- [ ] API routes: all analytics endpoints, promos

---

### Milestone 6 — Module System & Polish
**Goal:** Per-restaurant module toggling works end to end.

- [ ] Module config shape implemented in `restaurants.modules` (jsonb)
- [ ] Customer PWA reads modules at session start → hides disabled tabs/buttons
- [ ] Admin App reads modules at login → hides disabled nav tabs and screens
- [ ] API module middleware gates all endpoints by restaurant config
- [ ] Module configuration UI — DECISION still open (defer or build)
- [ ] Realtime: full test across all subscribed events
- [ ] All 28 screens QA verified against PHASE1-SPEC.md

---

## Unresolved Before Phase 4

| # | Item | Blocking |
|---|------|---------|
| 1 | Module config UI design | Milestone 6 |
| 2 | Admin login screen design | Milestone 3 scaffold |
| 3 | Promo Assignment nav location | Milestone 5 nav wiring |
| 4 | Kitchen Confirm — which tab is active | Milestone 1 |
| 5 | Post-payment success state | Milestone 1 |
| 6 | Post-server-request success state | Milestone 2 |

---

*Phase 3 complete. Awaiting approval to begin Phase 4 implementation.*
