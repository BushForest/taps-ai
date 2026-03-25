# TAPs Eats — Master Product & Engineering Plan

> **Author:** Aadi P.
> **Last Updated:** 2026-03-23
> **Status:** Active Development — Phase 3

---

## 1. Vision

TAPs Eats is an NFC-powered tableside commerce layer for restaurants. A guest taps an NFC tag at their table, lands instantly in a mobile-first web app (no download required), browses the live menu, views their check, places orders where the restaurant enables it, splits the bill however they want, pays, and optionally earns loyalty points — all without waiting on staff for every interaction.

**TAPs is not a POS replacement.** It sits on top of existing restaurant systems (Square, Toast, etc.) and keeps the guest-facing experience aligned with the restaurant's official records in real time.

---

## 2. The Problem We Solve

Restaurants want modern tableside ordering and payment without:
- Ripping out their existing POS
- Retraining their whole staff
- Introducing financial drift between guest-facing and in-house systems

Existing solutions fail on the hard cases:
- Split bills with modifiers and tiny add-ons
- Partial payments with concurrent payers
- Payment success before POS writeback completes
- Manual POS edits during an active guest session
- Stale table links when a new party sits down
- Support and reconciliation when state disagrees across systems

**TAPs wins by being rigorous about session lifecycle, split allocation, sync, and auditability from day one.**

---

## 3. Target Users

| User | What They Need |
|------|---------------|
| **Guest diner** | Fast tap-to-pay, clear split, no app download |
| **Guest browsing** | Live menu with prices, allergen info, modifiers |
| **Kitchen staff** | Real-time order display, station routing, alerts |
| **Server/bartender** | Live table status, chat notifications, upsell prompts |
| **Restaurant manager** | Exceptions queue, analytics, table/NFC mapping |
| **Taps ops/support** | Audit trails, reconciliation tools, dispute resolution |

---

## 4. Product Principles

1. POS is source of truth for official check, item, and closed/paid state.
2. TAPs owns guest session, payer identity, split intent, and guest-side temporary state.
3. Partial payer completion is allowed without prematurely closing the table.
4. Financial actions must be idempotent, replay-safe, and auditable.
5. Modifiers, condiments, and tiny charges cannot be stranded.
6. Session access must expire quickly for guests and longer for support.
7. Drift between TAPs and POS must be detected, surfaced, and reconciled.

---

## 5. Full Feature Set

### 5.1 Guest-Facing Web App (NFC/QR — No App Required)

#### Ordering & Payment
- **NFC Tap-to-Session** — tap NFC tag at table → instant session, no login required
- **QR Code Fallback** — for phones without NFC
- **Live Menu** — image-rich, categorized, price-stamped snapshot for this session
- **Order Placement** — customize and submit orders directly (restaurant-configurable: on/off per mode)
- **Live Wait Time Estimates** — per item/order, dynamic updates
- **Bill Splitting** — five modes:
  - Even split across payers
  - Pay by item (select your items)
  - Fractional item split (e.g., 25/25/50 on a shared dish)
  - Custom dollar amount
  - Hybrid (item assignment + dollar top-up)
- **Tip Selection** — percentage or custom amount at checkout
- **Partial Payment** — pay your share and leave while table stays open
- **Concurrent Payer Support** — multiple guests paying simultaneously, safely
- **POS Writeback** — payment recorded back to restaurant's POS

#### Guest Experience
- **Allergen-Aware Menu** — ingredient breakdown, dietary filters, "omit ingredient" option
- **Loyalty Capture** — enter phone number to earn points (optional, never blocks checkout)
- **Personalized Greetings** — "Welcome back, Alex! Your 10th visit!" for returning guests
- **Digital Receipt** — email or SMS link with feedback form
- **Live Chat with Waiter** — send requests ("Need napkins", "More water") from the web app
- **Session Expiry UX** — clear expired-state message with retap/reopen path (never shows stale data)
- **Stale Bill Detection** — if bill changes mid-checkout, UI blocks payment and requires refresh

---

### 5.2 Kitchen Display System (KDS)

- **Real-Time Order Board** — replaces paper tickets, shows all active orders
- **Station Filters** — grill sees grill items, fryer sees fryer items, salad bar sees salad items
- **Auto-Assigned Cooking Tasks** — orders routed to correct station automatically
- **Time Tracking** — timer per item and per order; delay alerts if prep exceeds threshold
- **Audio Announcements** — voice alerts for new orders ("New burger order received!")
- **Visual/Sound Alerts** — high-priority ticket escalation
- **Manager Delay Notification** — auto-flags overdue orders to the manager
- **Ingredient-Aware Automation** — real-time usage tracking, auto-restock alerts when low

---

### 5.3 Server / Staff App (Tablet Interface)

- **Live Table View** — see all tables with current status and order state
- **Customer Chat Inbox** — receive and respond to guest requests
- **Order Delivery Confirmation** — mark dishes as delivered
- **Upsell Prompts** — see table's previous orders, trigger reorder suggestions, offer desserts/drinks
- **Request Escalation** — notify kitchen or manager with one tap

---

### 5.4 Host / Front-of-House App

- **Visual Seating Map** — layout of tables with status: available / seated / cleaning / reserved
- **Table Assignment** — assign servers to tables
- **Table Status Tracking** — real-time table state visible at a glance
- **Queue & Waitlist** *(post-MVP)* — auto-estimate wait times based on table turnover

---

### 5.5 Admin / Manager Dashboard

> Matches the dashboard mockup: Dashboard, Kitchen, Analytics, Customer Seating Area, Staff Management

#### Operations
- **KDS Overview** — see all current orders and kitchen load
- **Payments & Revenue** — payments processed, daily totals, tips
- **Analytics Dashboard** — top-selling items, peak hours, sales trends, staff performance, tip tracking
- **Table Management** — active tables, guests per table, wait time
- **NFC/Table Mapping** — register and manage NFC tags and table assignments
- **Live Session List** — all active dining sessions per restaurant
- **Exception Queue** — sync and payment exceptions with recommended actions
- **Payment Audit** — searchable by session, check, and provider reference
- **Session Lifecycle View** — whether a table is publicly active, grace-expired, audit-only, or archived

#### Staff & Inventory
- **Staff Management** — track server assignments, performance, tips
- **AI-Generated Staff Scheduling** — suggest schedules based on historical peak hours
- **Ingredient Tracking** — real-time usage levels, restock alerts, per-station usage
- **Auto-Restock Alerts** — low-inventory notifications before shortages hit

#### Intelligence
- **Predictive Analytics** — AI forecasts busy hours, staffing needs, inventory requirements
- **AI-Driven Menu Optimization** — predicts best-sellers by time of day
- **Dynamic Pricing Recommendations** *(post-MVP)* — AI-powered happy hour, day-based offers
- **Customer Behavior Insights** — repeat customer profiles, favorites, visit frequency

---

### 5.6 Loyalty & Customer Recognition

- **Phone Number Loyalty** — capture at checkout (optional), normalize, match to existing profile
- **Points per Visit/Spend** — configurable reward rules
- **Retroactive Loyalty Attachment** — link phone after payment, within session retention window
- **Personalized Promotions** — auto-generated based on past visit patterns
- **Optional Facial Recognition** *(future)* — recognize returning customers for premium personalization

---

### 5.7 Payments & Security

- **Stripe & Square Integration** — primary payment rails; Toast as future target
- **PCI-DSS Compliance** — encrypted transactions, server-side secrets only
- **Idempotent Payment Intents** — keyed to session + payer + amount + check version
- **Partial Payment Support** — pay your share; table stays open
- **Concurrent Payment Safety** — allocation hash + check version guard prevents conflicts
- **Pending Writeback UX** — shows guest "success with pending confirmation" when POS sync is delayed
- **Fraud Prevention** — direct debit option, AI monitoring for suspicious patterns
- **Refund & Void Auditability** — every refund tied to original payment record
- **Webhook Verification** — provider signature validation, replay-safe

---

### 5.8 System-Level & Infrastructure

- **Offline Resilience** — orders, KDS, and server dashboard work locally without internet; internet only required for payments or cloud backup
- **Menu Caching** — hosted on local router to avoid internet lag
- **Push Notifications** — manager-to-team broadcasts, kitchen-to-server alerts
- **Role-Based Access** — Admin / Manager / Server / Kitchen / Guest
- **Session Privacy** — new party at same table always gets fresh session token; no data leakage
- **Audit Trail** — every financial action records: actor, action, subject, idempotency key, timestamp
- **Reconciliation Workers** — background jobs detect and surface POS/TAPs state drift

---

## 6. Architecture

### 6.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Monorepo** | pnpm workspaces + Turborepo | Shared contracts, fast builds, dependency isolation |
| **Language** | TypeScript throughout | Type safety across API, frontend, and domain logic |
| **Customer Web** | Next.js (React) | Mobile-first, SSR for fast initial load, NFC web API |
| **Admin Web** | Next.js (React) | Same stack as customer web, reuse UI primitives |
| **API** | Hono on Node.js | Lightweight, edge-compatible, great TypeScript DX |
| **Database** | PostgreSQL + Drizzle ORM | ACID transactions for financial correctness |
| **POS Adapters** | Square-first, adapter pattern | Isolate provider logic; add Toast/others without core changes |
| **Payments** | Stripe (custom) + Square POS SDK | Stripe for web payments; Square for restaurants on Square POS |
| **Background Jobs** | Worker processes (Node.js) | Reconciliation, session expiry, menu sync |
| **AI Agents** | MCP (Model Context Protocol) | Orchestrate menu, check, session, split agents |
| **Observability** | Structured logging + tracing | Every session/payment fully inspectable |
| **Infrastructure** | Docker + Terraform | Local dev parity; deploy to Fly.io or Render |

### 6.2 Monorepo Structure

```
taps/
├── apps/
│   ├── api/              # Hono API server
│   ├── customer-web/     # Guest NFC/QR web app (Next.js)
│   └── admin-web/        # Manager/staff dashboard (Next.js)
├── packages/
│   ├── contracts/        # Shared TypeScript types & MCP schemas
│   ├── domain/           # State machines, value objects, events
│   ├── mcp/              # AI agent runtime & providers
│   ├── db/               # Drizzle schema, migrations, client
│   ├── config/           # Environment & feature config
│   ├── observability/    # Logger, tracer
│   └── testing/          # Shared test builders & fixtures
├── infra/
│   ├── docker/           # Compose for local dev
│   └── terraform/        # Cloud infra
├── tests/
│   ├── unit/             # Allocation math, state machine guards
│   ├── integration/      # End-to-end session/check/payment flows
│   ├── contracts/        # Per-provider POS adapter contract tests
│   ├── concurrency/      # Parallel payment attempt stress tests
│   └── reconciliation/   # Delayed writeback & closed-state drift
└── scripts/              # Seed data, worker runners, ops tools
```

### 6.3 Core Domain Model

```
Restaurant
  └── Table (permanent)
       └── NFC Tag (permanent identifier)
            └── Session (rotates between parties)
                 ├── Check (mirrored from POS, versioned)
                 │    └── LineItems (items + modifiers)
                 ├── Payers (guests participating in this session)
                 │    └── Allocations (what each payer owes)
                 ├── Payments (idempotent, auditable)
                 │    └── POS Writeback Status
                 └── Loyalty Profile (optional, by phone)
```

### 6.4 Critical State Machines

**Session States:** `pending` → `active` → `closing` → `closed` → `expired` → `archived`

**Check States:** `open` → `partial_paid` → `fully_paid` → `closed` | `reopened` | `transferred`

**Payment States:** `pending` → `authorized` → `captured` | `failed` | `provider_succeeded_pending_pos`

---

## 7. Key Edge Cases (Handled From Day One)

| Scenario | System Response |
|----------|----------------|
| Item added after split begins | Invalidate allocation, refresh guest UI, recompute remainder |
| Staff voids item while guest is in checkout | Remove/mark voided, warn guests with stale view |
| Payment succeeds but POS sync delayed | Show "pending confirmation" state; never silently succeed |
| POS closes check before TAPs knows | Lock guest interactions, reconcile, close session |
| Two guests paying simultaneously | Allow non-overlapping allocations; reject stale/conflicting plans |
| Rounding penny drift on fractional splits | Largest remainder algorithm; strict tolerance at table close |
| New party taps table with old session link active | Public access rejected; fresh session token issued |
| Modifier item left unassigned | Block table close; highlight orphan to guest |
| Restaurant manually edits order during checkout | Increment check version; force guest refresh before payment |

---

## 8. Phased Roadmap

### Phase 0: Foundations (COMPLETE)
- [x] Monorepo scaffold (pnpm + Turborepo)
- [x] TypeScript contracts and domain packages
- [x] PostgreSQL schema with Drizzle migrations
- [x] Observability package (logger + tracer)
- [x] Docker Compose for local dev

### Phase 1: Architecture Docs (COMPLETE)
- [x] `project_scope.md`
- [x] `functional_spec.md`
- [x] `edge_case_matrix.md`
- [x] `execution_plan.md`

### Phase 2: Repository Scaffold (COMPLETE)
- [x] API app skeleton
- [x] Customer web skeleton
- [x] Admin web skeleton
- [x] Domain state machines (session, check, payment)
- [x] MCP agent stubs (menu, check, session, loyalty, analytics)
- [x] Square POS provider scaffold
- [x] Worker stubs (session expiry, menu sync, reconciliation)

### Phase 3: Core Flow Implementation (IN PROGRESS)

**3.1 NFC Table Session (Priority 1)**
- [ ] NFC tag registry (restaurant + table mapping)
- [ ] Tag validation on tap
- [ ] Session creation / reuse policy
- [ ] Public session token issuance
- [ ] Session expiry validation (guest vs. support windows)

**3.2 Menu Retrieval (Priority 2)**
- [ ] Menu fetch through Square POS adapter
- [ ] Item normalization + modifier attachment
- [ ] Availability and price stamping
- [ ] Session-scoped menu snapshot with versioning
- [ ] Fallback to mirrored/cached menu when POS unavailable

**3.3 Check Retrieval (Priority 3)**
- [ ] Fetch or create open check via POS adapter
- [ ] Internal normalized check snapshot builder
- [ ] Versioning and stale-check detection
- [ ] Admin check view

**3.4 Split Payment Allocation Engine (Priority 1 — highest risk)**
- [ ] Equal split
- [ ] Item assignment
- [ ] Fractional split with basis-point rounding
- [ ] Custom dollar allocation
- [ ] Hybrid mode
- [ ] Orphan prevention (`validate_no_orphan_items`)
- [ ] Remainder visibility always-on
- [ ] Close validation (zero balance, no orphans, no pending payments)

**3.5 Payment Orchestration (Priority 1 — financial core)**
- [ ] Idempotent payment intent creation
- [ ] Stripe web payment flow
- [ ] Square POS payment flow
- [ ] Authorization + capture lifecycle
- [ ] Partial payment support
- [ ] Pending/failure handling + retry path
- [ ] POS writeback tracking
- [ ] Refund and void audit trail

**3.6 POS Sync & Reconciliation (Priority 2)**
- [ ] Square webhook ingestion + signature verification
- [ ] Polling reconciler worker
- [ ] Check change detection (version increment)
- [ ] Close/transfer/merge detection
- [ ] Exception queue for unresolved drift

**3.7 Loyalty Phone Capture (Priority 3)**
- [ ] Phone normalization (E.164)
- [ ] Profile lookup or creation
- [ ] Session attachment
- [ ] Points award path
- [ ] Retroactive attachment after payment

**3.8 Session Close & Expiry (Priority 2)**
- [ ] Close validation (all conditions met)
- [ ] Public grace expiry window
- [ ] Support/audit retention window
- [ ] Archive job
- [ ] Table privacy rotation (new party = fresh token)

**3.9 KDS (Kitchen Display System) (Priority 2)**
- [ ] Real-time order board via WebSocket/SSE
- [ ] Station filter configuration per restaurant
- [ ] Auto-routing logic
- [ ] Timer and delay alerts
- [ ] Audio notification integration

**3.10 Admin Dashboard (Priority 3)**
- [ ] KDS Overview panel
- [ ] Payments & Revenue panel
- [ ] Analytics Dashboard (top items, peak hours)
- [ ] Table Management panel
- [ ] Session list per restaurant
- [ ] Exception queue with recommended actions
- [ ] NFC tag management

**3.11 Server / Staff App (Priority 3)**
- [ ] Live table list
- [ ] Guest chat inbox
- [ ] Order delivery confirmation
- [ ] Upsell prompt engine

**3.12 Critical Tests (add alongside each feature — not deferred)**
- [ ] Split allocation: fractional (25/25/50) + hybrid mode unit tests
- [ ] Rounding engine: largest-remainder algorithm edge cases (penny drift)
- [ ] Session token rotation: new party tap invalidates prior session token
- [ ] Payment + pending POS writeback: success state without POS confirmation
- [ ] Session close with orphan items: validation rejects close correctly
- [ ] Menu cache fallback: serve cached menu when Square API unavailable
- [ ] Admin exception queue: exception created on POS drift detection

### Phase 4: Pilot Hardening
- [ ] Load testing (split allocation, concurrent payments)
- [ ] Square adapter contract test suite
- [ ] Operational dashboards
- [ ] Admin exception tooling polish
- [ ] Offline resilience (local router caching)
- [ ] Launch runbooks per restaurant type

### Phase 5: Post-MVP Expansion
- [ ] Toast POS adapter
- [ ] Native iOS/Android apps
- [ ] Uber Eats / DoorDash hybrid dine-in/takeout integration
- [ ] Table reservation + waitlist system
- [ ] AI-generated menu suggestions (trend-based)
- [ ] Dynamic pricing and promotions engine
- [ ] Multi-location / franchise dashboard
- [ ] Automated payout and accounting exports
- [ ] Advanced CRM and loyalty federation

---

## 9. Critical Path

The following must be solid before anything else matters:

1. Normalized domain model (contracts + schema)
2. POS adapter contract (Square first)
3. Check snapshot + versioning
4. Split allocation engine (correctness + orphan prevention)
5. Payment orchestration + idempotency
6. Reconciliation workflows (POS drift detection)
7. Session close/expiry safety (privacy at table turnover)

**If these are weak, the rest of the product is cosmetic.**

---

## 10. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Tap-to-rendered menu | < 2 seconds (warm path) |
| Payment initiation success | > 99% |
| Orphan line items at table close | Zero |
| Undetected POS/TAPs closed-state mismatches | Zero |
| Support can explain any payment event from audit logs | 100% |
| Restaurant onboard without replacing POS | Yes |

---

## 11. Go-To-Market

- **MVP Target:** 3–5 small restaurants (controlled pilot)
- **Scale Target:** 10+ restaurants within 6 months of pilot
- **Onboarding:** Restaurant keeps their POS; TAPs adds a layer on top
- **Hardware Required:** NFC tags per table (cheap, one-time)
- **Staff Training:** Minimal — POS workflow unchanged; staff just see a new admin tab

---

## 12. Core Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| POS API variability per provider | Adapter pattern isolates all provider logic; Square-first de-risks initial build |
| Split payment concurrency bugs | Allocation hash + check version guards; concurrent payment tests in CI |
| Payment success before POS sync creates confusion | Explicit pending-writeback UX state; reconciliation workers |
| Session turnover leaks old table context | Public token rotation; `validate_public_access` hard-rejects old tokens |
| Provider outages during payment | Idempotency keys make all retries safe; pending state never silently clears |
| **iOS does not support Web NFC API** | QR code fallback is always available; NFC is enhancement, not requirement. iOS = QR path always. Document clearly in onboarding materials and NFC tag placement signage |
| Multi-tenant Square rate limits | Each restaurant must have its own Square API key; never share credentials across tenants |

---

## 13. Monetization Model

*Taste decision — choose before pilot launch:*

| Model | Structure | Best For |
|-------|-----------|---------|
| **SaaS per restaurant** | $99–299/mo per location | Predictable ARR, easy to quote |
| **Per-transaction fee** | 0.5–1% of payment volume | Aligns with restaurant success, higher ceiling |
| **Hybrid** | Low monthly + low per-transaction | Common fintech model, lowers barrier to entry |

**Recommendation for pilot:** Start with flat SaaS ($149/mo) to simplify pilot contracts. Introduce per-transaction fee post-MVP when payment volume data exists to price it right.

---

## 14. Error & Rescue Registry

| Error Scenario | Detection | Guest UX | System Action |
|----------------|-----------|----------|---------------|
| Square API unavailable | Health check + timeout | "Menu may be slightly delayed" banner | Serve cached snapshot; block new payments; alert admin |
| Stripe payment fails post-auth | Payment webhook or timeout | "Payment didn't go through — try again" | Idempotency key allows safe retry; balance unchanged |
| POS webhook never arrives | Reconciliation worker timeout (60s) | No guest impact | Create exception in queue; schedule retry; notify manager |
| Session token expired mid-payment | JWT validation fails | "Your session expired — retap to continue" | Reject cleanly; do not process payment |
| DB connection lost | Query throws | 503 page | Circuit breaker; no silent partial writes; health check fails |
| POS closes check while guest in checkout | Polling / webhook | "Your bill has been settled at the register" | Lock guest payment flow; session transitions to closing |
| Menu unavailable from POS | Adapter timeout | "Menu loading…" with fallback content | Serve cached/mirrored menu if configured; surface error to admin |

---

## 15. Phase 3 Prerequisites (Before Writing Code)

Before starting Phase 3 implementation, ensure these are in place:

- [ ] **Square Sandbox Account** — create at developer.squareup.com; get sandbox API key
- [ ] **Local HTTPS** — Web NFC API requires HTTPS even in dev; use `mkcert` or `caddy` for localhost SSL
- [ ] **Stripe Test Account** — create test keys at dashboard.stripe.com
- [ ] **PostgreSQL running** — via `docker-compose up` in `infra/docker/`
- [ ] **Seed data** — run `scripts/seed.ts` to create test restaurant, tables, NFC tags
- [ ] **NFC test hardware** — at least one NFC tag programmed with a test URL for mobile testing

---

## 16. API & Security Details

### Authentication
- **Guest sessions:** Short-lived JWT (1hr TTL) scoped to session token. Issued on NFC/QR tap. No login required.
- **Admin/staff:** Auth JWT (24hr) with refresh token. Role-based: Admin / Manager / Server / Kitchen.
- **Provider secrets:** Server-side only. Never in client bundles. Rotated per restaurant.

### URL Schema
- Guest web: `/s/{sessionToken}` (opaque token, no table ID exposed)
- Guest menu: `/s/{sessionToken}/menu`
- Guest check: `/s/{sessionToken}/check`
- Guest pay: `/s/{sessionToken}/pay`
- Admin: `/admin/restaurants/{restaurantId}/sessions`
- Admin exceptions: `/admin/restaurants/{restaurantId}/exceptions`

### Middleware Stack (API)
- Rate limiting (Hono built-in) — stricter on payment endpoints (10 req/min per IP)
- CORS — allow customer-web and admin-web origins; block all others
- CSP headers — strict policy on web apps
- Webhook signature verification — Square HMAC-SHA256; Stripe webhook secret

### Caching
- Menu snapshots: Redis (or in-memory Map for MVP) with 60s TTL per restaurant
- This is **required** to hit the < 2s tap-to-render target (Square API cold call: 300-800ms)

---

## 17. UI / UX Requirements (Additions)

### Component Library
- **shadcn/ui + Tailwind CSS** across all three apps (customer-web, admin-web, KDS)
- Shared `packages/ui` for common components (avoids drift between apps)

### Guest Web — Loading States
- Skeleton screens during menu load (card placeholders for menu items)
- Spinner during payment processing with "Don't close this tab" message
- "Refreshing your bill…" state when check version changes mid-session

### Guest Web — First-Time User Flow
- After NFC/QR tap: brief "Welcome to [Restaurant Name]" splash (0.5s) with table number confirmation
- Helps non-tech-savvy guests understand what just happened

### Guest Web — PWA
- `manifest.json` for "Add to Home Screen" on iOS/Android
- Service worker for offline menu caching (last-known menu serves when offline)
- iOS users: QR code is the entry point (no Web NFC on Safari); QR must be placed visibly on table

### KDS Screen
- SSE (Server-Sent Events) for real-time order stream (read-only, simpler than WebSocket)
- Large-format display optimized (min 768px width assumed)
- High-contrast color coding: new orders (yellow), in-progress (blue), ready (green), overdue (red)

---

## 18. Critical Database Indexes

Add to Phase 3 schema work (migration `0003_indexes.sql`):

```sql
-- Session lookups by restaurant + status (admin live view)
CREATE INDEX idx_sessions_restaurant_status ON sessions(restaurant_id, status);

-- Payment deduplication (idempotency enforcement)
CREATE UNIQUE INDEX idx_payments_idempotency ON payments(idempotency_key);

-- Check lookup by POS reference (reconciliation)
CREATE INDEX idx_checks_pos_id ON checks(pos_check_id);

-- NFC tag lookup (on every tap)
CREATE UNIQUE INDEX idx_nfc_tags_uid ON nfc_tags(uid);

-- Session expiry worker (finds sessions to expire)
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE status = 'active';
```

---

## 19. Build Order (Recommended)

1. Phase 3 prerequisites (Square sandbox, local HTTPS, seed data) — **block on this first**
2. DB indexes migration (`0003_indexes.sql`)
3. API auth middleware (JWT guest + admin)
4. Session + NFC tag flow
5. Menu retrieval through Square adapter + cache layer
6. Check retrieval + snapshot versioning
7. Split allocation engine (most critical logic) + full unit tests
8. Payment orchestration (Stripe web + Square POS) + idempotency tests
9. POS webhook/poll reconciliation
10. Session close/expiry workers + token rotation tests
11. Loyalty phone capture
12. KDS real-time SSE order board
13. Admin exception dashboard
14. Server/staff app
15. PWA manifest + service worker (customer-web)
16. UX polish: skeleton states, first-time user splash, loading states

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
| 1 | CEO | Keep web-first / Next.js (no Flutter) | P3 Pragmatic | Existing scaffold is weeks of work; QR handles iOS | Flutter rebuild |
| 2 | CEO | Add Error & Rescue Registry (§14) | P1 Completeness | Missing from plan; every prod system needs recovery paths | Deferred |
| 3 | CEO | Add iOS NFC limitation as explicit risk | P1 Completeness | iOS never gets Web NFC; QR must be primary for iOS users | Ignored |
| 4 | CEO | Add Phase 3 Prerequisites section (§15) | P1 Completeness | Square sandbox + local HTTPS + seed data = day-1 blockers | Deferred |
| 5 | Design | Add URL schema: /s/{sessionToken} (§16) | P5 Explicit | Opaque token protects privacy; forces explicit design decision | /t/{tableId} (exposes table) |
| 6 | Design | Add first-time user welcome splash | P1 Completeness | Non-tech guests need a moment of orientation post-tap | Skip |
| 7 | Design | shadcn/ui + Tailwind CSS component library (§17) | P5 Explicit | Consistent across 3 apps; zero-config; TypeScript-native | Custom design system |
| 8 | Design | Add PWA manifest + service worker (§17) | P1 Completeness | Offline menu caching already in scope; PWA makes it real | Deferred |
| 9 | Design | Add skeleton/loading state requirements (§17) | P1 Completeness | Cold path is 1-2s; blank white page is bad UX | Deferred |
| 10 | Eng | Add auth strategy: guest JWT 1hr + admin JWT 24hr (§16) | P5 Explicit | Security gap; must be decided before first API endpoint | Unspecified |
| 11 | Eng | SSE for KDS (not WebSocket) | P5 Explicit | Read-only stream; simpler; HTTP/2 friendly | WebSocket |
| 12 | Eng | Co-locate workers in API process for MVP | P3 Pragmatic | Simpler deployment; extract to containers in Phase 4 | Separate containers now |
| 13 | Eng | Add Redis/in-memory cache for menu snapshots (§16) | P1 Completeness | Required to hit < 2s tap-to-render; Square cold call is 300-800ms | No cache |
| 14 | Eng | Add critical DB indexes to Phase 3 (§18) | P1 Completeness | Missing indexes = slow queries at scale; cheap to add now | Post-MVP |
| 15 | Eng | Add rate limiting to API middleware (§16) | P1 Completeness | Payment endpoints are abuse targets; Hono has built-in | Deferred |
| 16 | Eng | Add CORS + CSP headers to API (§16) | P1 Completeness | Security basics; customer-web is a different origin | Deferred |
| 17 | Eng | Add multi-tenant Square rate limit risk (§12) | P1 Completeness | 10+ restaurants on same key = rate cap issues | Ignored |
| 18 | Eng | Add 7 critical missing tests to Phase 3 (§3.12) | P1 Completeness | Tests are cheapest lake to boil (human: 2 days / CC: 15 min) | Deferred |

**TASTE DECISION (surfaced, not auto-decided):**
- **Monetization model** (§13): SaaS vs per-transaction vs hybrid. Recommendation: flat SaaS for pilot ($149/mo), revisit post-MVP.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAN | 6 issues found, all resolved (Error registry, iOS NFC, Prereqs, Monetization gap, Risk additions) |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | SKIPPED | Codex not available in this environment |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAN | 9 issues found, all resolved (Auth, SSE, Caching, Indexes, Rate limiting, CORS, Tests) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAN | 5 issues found, all resolved (URL schema, Component lib, PWA, Loading states, First-time UX) |

**VERDICT:** APPROVED — 18 auto-decisions applied, 1 taste decision surfaced (monetization model). Plan is implementation-ready.
