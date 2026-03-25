# TAPs Eats — Phase 2: Architecture
> Derived from PHASE1-SPEC.md (28 screens, tapseat.pen).
> Where sketch navigation is explicit, it is cited. Where decisions are required, they are marked as DECISION.

---

## 1. Platform Assignments

| App | Platform | Why |
|-----|----------|-----|
| Customer PWA | Next.js 15 App Router (PWA) | NFC scan → URL, no install, runs in Safari |
| Admin App | Expo React Native | Phone-native for floor staff; push alerts; works offline |
| API | Node.js / Hono (existing port 4000) | Already running, shared by both apps |
| Database | Supabase (Postgres + Auth + Realtime) | Auth, row-level security, realtime for floor updates |

---

## 2. Monorepo Structure

```
Taps_AI/
├── apps/
│   ├── customer-web/          # Next.js PWA (existing, port 3002)
│   ├── admin-web/             # Next.js admin (existing, port 3001) → migrate to RN
│   ├── admin-mobile/          # NEW: Expo React Native admin app
│   └── api/                   # Hono API (existing, port 4000)
├── packages/
│   ├── contracts/             # Shared TypeScript types
│   ├── ui/                    # Shared design tokens (colors, fonts, spacing)
│   └── utils/                 # Shared helpers (currency, date, etc.)
└── PHASE1-SPEC.md
```

---

## 3. Screen Hierarchy & Route Map

### 3A — Customer PWA

Entry point: NFC tag scan → `taps.blackblue.ca/s/[token]`

```
/s/[token]/                         → Menu Tab          (QyeVt)
/s/[token]/item/[itemId]            → Item Expanded      (i8cYK)
/s/[token]/kitchen-confirm          → Kitchen Confirm    (7AoYl)
/s/[token]/bill                     → Live Bill          (1B29b)
/s/[token]/pay                      → Pay Tab (Split)    (uWSAa)
/s/[token]/pay/whole                → Pay Whole Tab      (Ljq8D)
/s/[token]/signin                   → Sign In            (SSrbr)
/s/[token]/server                   → Request Server     (xFqLF)
/s/[token]/profile                  → Profile            (VBVOc)
/s/[token]/profile/edit             → Edit Profile       (RU9cE)
/s/[token]/profile/payment-methods  → Payment Methods    (KfO5H)
/s/[token]/profile/orders           → Order History      (QuuQx)
/s/[token]/profile/preferences      → Preferences        (Jg1eR)
/s/[token]/profile/settings         → Settings           (lNkeD)
```

**Navigation sources (from sketch + resolved decisions):**
- 3-tab bottom nav → Menu, Live Bill, Pay
- Header `Sign In` button → Sign In (when not authenticated)
- Header avatar icon → Profile (when signed in — replaces Sign In button)
- Header `Server` button → Request Server
- Menu item tap → Item Expanded
- Item Expanded `Send to Kitchen` → Kitchen Confirm
- Pay Tab: Pay Whole Tab, Split Evenly, Pay for My Items, Custom Amount expand in-place (accordion) — no separate screens for the last two
- Profile list rows → sub-screens (back arrow visible on all sub-screens)

---

### 3B — Admin App

Entry point: Staff login → Floor View

```
/                                   → Floor View         (aTOvy)
/sessions                           → Sessions           (mfayM)
/sessions/[sessionId]               → Table Detail       (hBI3e)
/sessions/[sessionId]/edit          → Edit Order         (QxOvz)
/sessions/[sessionId]/adjust        → Adjust Bill        (u4SRA)
/sessions/[sessionId]/flag          → Flag Issue         (hbtHG)
/exceptions                         → Exceptions         (6nP4C)
/analytics                          → Analytics          (z96aY)
/analytics/item-pairings            → Item Pairings      (Byc4P)
/analytics/issues                   → Issues & Adj.      (FXL56)
/analytics/kitchen                  → Kitchen & Ops      (Ivgvf)
/analytics/revenue                  → Revenue Deep Dive  (Z0r16)
/analytics/customers                → Repeat Customers   (YlHpL)
/analytics/promos                   → Promo Assignment   (8QYCz)
```

**Navigation sources (from sketch):**
- 4-tab bottom nav → Floor, Sessions, Exceptions, Analytics (all frames)
- Sessions list tap → Table Detail (implied by "View Order" button)
- Table Detail action buttons → Edit Order, Adjust Bill, Flag Issue
- Analytics sub-screens all show `← Analytics` back nav (Byc4P, FXL56, Ivgvf, Z0r16, YlHpL)
- DECISION: Promo Assignment nav location (sketch shows Analytics tab active, UNCLEAR FROM SKETCH)

---

## 4. Shared Design System

Tokens apply to both Customer PWA and Admin App.

### 4A — Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0e0e0e` | Page/screen background |
| `--color-surface` | `#1a1a1a` | Cards, input fields |
| `--color-header` | `#111111` | Header bar, bottom nav |
| `--color-gold` | `#c9a96e` | Primary accent, CTAs, active states |
| `--color-text-primary` | `#ffffff` | Main text |
| `--color-text-secondary` | `#888888` | Labels, sub-text, disabled |
| `--color-danger` | `#ef4444` | Sign Out, Delete, Flag Issue button |
| `--color-success` | `#5fad7e` | Connected, Paid, On Table |
| `--color-warning` | `#d4882e` | About to Pay, negative KPI |
| `--color-status-seated` | `#5b8ef5` | Just Seated table badge |
| `--color-status-eating` | `#5fad7e` | Eating table badge |
| `--color-status-paying` | `#d4882e` | About to Pay table badge |
| `--color-status-alert` | `#ef4444` | Assistance Requested table badge |

### 4B — Typography

| Token | Value |
|-------|-------|
| `--font-family` | `Inter` |
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |

### 4C — Shared UI Components

| Component | Used In | Description |
|-----------|---------|-------------|
| `GoldButton` | Both | Full-width gold pill CTA |
| `OutlineButton` | Both | Gold or gray outline pill |
| `TextLink` | Both | Plain text link (Cancel, Keep Browsing, etc.) |
| `SectionLabel` | Both | ALL CAPS gray section header |
| `ToggleSwitch` | Both | Gold when ON, gray when OFF |
| `ChipPill` | Both | Selectable tag pill (gold = selected) |
| `AvatarCircle` | Customer | Initials circle |
| `StatusBadge` | Admin | Colored pill for table states |
| `AdminBadge` | Admin | Gold `ADMIN` label in nav bars |
| `BottomNav` | Both | Fixed tab bar (3-tab customer, 4-tab admin) |
| `CardSurface` | Both | `#1a1a1a` rounded card container |
| `CheckboxRow` | Admin | Checkbox + label + price row |

---

## 5. Data Model

### Core Entities

```typescript
Restaurant {
  id: string
  name: string                   // "BLACK+BLUE TORONTO"
  modules: ModuleConfig          // which features are enabled
}

Table {
  id: string
  restaurantId: string
  number: number                 // TABLE 1 - TABLE 12
  status: TableStatus            // available | just_seated | eating | paying | assistance
  nfcToken: string               // NFC tag → session URL token
}

Session {
  id: string
  tableId: string
  restaurantId: string
  openedAt: string               // ISO datetime
  status: SessionStatus          // active | payment_in_progress | partially_paid | fully_paid
  payers: Payer[]
  check: Check
  assistRequested: boolean
}

Check {
  id: string
  sessionId: string
  lines: LineItem[]
  totalCents: number
  amountPaidCents: number
  remainingBalanceCents: number
}

LineItem {
  id: string
  checkId: string
  parentLineId: string | null    // null = top-level item
  name: string
  grossCents: number
  quantity: number
  modifiers: Modifier[]         // doneness, sauce, notes
  status: LineStatus            // in_kitchen | on_table
}

Modifier {
  id: string
  lineItemId: string
  type: string                  // doneness | sauce | note
  value: string                 // "Medium Rare" | "Béarnaise" | "No croutons"
}

Payer {
  id: string
  sessionId: string
  customerId: string | null     // null if guest
  amountPaidCents: number
}

Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  tier: string                  // "Gold Member" etc.
  dietaryPreferences: string[]  // ["No Shellfish", "Gluten Free", ...]
  allergies: string
  seatingPreference: string     // "Indoor" | "Outdoor"
  notificationPrefs: NotificationPrefs
  savedPaymentMethods: PaymentMethod[]
}

NotificationPrefs {
  orderUpdates: boolean
  promotions: boolean
  serverNotifications: boolean
}

PaymentMethod {
  id: string
  customerId: string
  type: string                  // "visa" | "mastercard" | "apple_pay" | "google_pay"
  last4: string | null
  expiry: string | null
  isDefault: boolean
  isConnected: boolean          // for digital wallets
}

Payment {
  id: string
  sessionId: string
  payerId: string
  amountCents: number
  tipCents: number
  tipPercent: number
  method: string                // "apple_pay" | "google_pay" | "samsung_pay"
  splitType: SplitType          // whole | evenly | by_items | custom
  splitPeopleCount: number | null
}

Exception {
  id: string
  restaurantId: string
  sessionId: string | null
  type: string                  // "assist_requested" | "long_wait" | "food_quality" | ...
  severity: string              // "critical" | "warning"
  summary: string
  description: string
  status: string                // "open" | "resolved" | "ignored"
  detectedAt: string
  resolvedAt: string | null
  details: Record<string, unknown>
}

ServerRequest {
  id: string
  sessionId: string
  type: string                  // "water" | "utensils" | "ice" | "refill" | "other"
  status: string                // "pending" | "fulfilled"
  requestedAt: string
}

BillAdjustment {
  id: string
  sessionId: string
  reason: string                // "sent_back" | "comp" | "wrong_item" | "complaint" | "price_fix" | "split_fix"
  affectedLineIds: string[]
  creditAmountCents: number
  serverNotes: string
  requiresManagerApproval: boolean
  approvedBy: string | null
  submittedAt: string
}

IssueFlag {
  id: string
  sessionId: string
  type: string                  // "customer_complaint" | "food_quality" | "long_wait" | "staff_issue" | "safety_concern" | "other"
  priority: string              // "low" | "medium" | "high"
  description: string
  affectedLineIds: string[]
  notifyManager: boolean
  submittedAt: string
}

Promo {
  id: string
  restaurantId: string
  name: string
  discountType: string          // "percentage" | "value"
  amount: number
  maxUses: number
  usedCount: number
  startDate: string
  endDate: string
  status: string                // "active" | "expired"
}

OrderHistoryEntry {
  id: string
  customerId: string
  date: string
  items: string[]
  tableNumber: number
  totalCents: number
  rating: number | null
}
```

---

## 6. Module System Architecture

The Admin App also functions as a **per-restaurant module configurator**. Each restaurant can enable or disable feature modules. This controls:

1. Which screens appear in the Customer PWA
2. Which tabs/sections appear in the Admin App
3. Which API endpoints are active for that restaurant

### 6A — Module Definitions

Each module maps to one or more screens from the Phase 1 spec.

| Module ID | Name | Customer Screens | Admin Screens |
|-----------|------|-----------------|---------------|
| `menu_ordering` | Menu & Ordering | QyeVt, i8cYK, 7AoYl | — |
| `live_bill` | Live Bill | 1B29b | — |
| `payments` | Payments | uWSAa, Ljq8D | — |
| `server_request` | Request Server | xFqLF | — |
| `customer_profile` | Customer Profile | VBVOc, RU9cE, KfO5H, QuuQx, Jg1eR, lNkeD | — |
| `floor_view` | Floor View | — | aTOvy |
| `session_management` | Session Management | — | mfayM, hBI3e, QxOvz |
| `bill_adjustment` | Bill Adjustment | — | u4SRA |
| `exceptions` | Exceptions & Alerts | — | 6nP4C, hbtHG |
| `analytics_core` | Core Analytics | — | z96aY |
| `analytics_pairings` | Item Pairings | — | Byc4P |
| `analytics_issues` | Issues & Adjustments Analytics | — | FXL56 |
| `analytics_kitchen` | Kitchen & Ops Analytics | — | Ivgvf |
| `analytics_revenue` | Revenue Deep Dive | — | Z0r16 |
| `repeat_customers` | Repeat Customers | — | YlHpL |
| `promo_management` | Promo Management | — | 8QYCz |

### 6B — Module Config Shape

```typescript
ModuleConfig {
  menu_ordering: boolean
  live_bill: boolean
  payments: boolean
  server_request: boolean
  customer_profile: boolean
  floor_view: boolean
  session_management: boolean
  bill_adjustment: boolean
  exceptions: boolean
  analytics_core: boolean
  analytics_pairings: boolean
  analytics_issues: boolean
  analytics_kitchen: boolean
  analytics_revenue: boolean
  repeat_customers: boolean
  promo_management: boolean
}
```

### 6C — Module Configuration UI

DECISION: A module configuration screen is needed in the Admin App for enabling/disabling per-restaurant modules. **This screen does not exist in the current sketch.** It must be designed and added before Phase 4.

Options:
- A) Add a new `Admin · Module Settings` screen to the sketch before Phase 4
- B) Build it as a web-only admin panel (separate from the phone app)
- C) Define it as part of Phase 3 and design it alongside the build

### 6D — Module Enforcement

- **Customer PWA:** At session start, fetch `restaurant.modules` → hide tabs/buttons for disabled modules
- **Admin App:** At login, fetch `restaurant.modules` → hide nav tabs and screens for disabled modules
- **API:** Middleware checks `restaurant.modules` before serving module-specific endpoints

---

## 7. Auth Architecture

| Role | App | Auth Method |
|------|-----|-------------|
| Guest | Customer PWA | No auth — session token from NFC only |
| Customer | Customer PWA | Email+password, Phone OTP, Apple, Google |
| Staff | Admin App | Email+password (restaurant-scoped) |
| Manager | Admin App | Same as Staff + manager approval capability |
| Admin | Admin App | Full access including module config |

**Supabase RLS (Row Level Security):**
- All tables scoped by `restaurant_id`
- Staff can only read/write their own restaurant's data
- Customers can only read/write their own session and profile

---

## 8. Realtime Requirements

These states must update live without page refresh (Supabase Realtime channels):

| Event | Subscribers |
|-------|------------|
| Table status changes | Admin Floor View |
| New line item added to order | Admin Table Detail, Customer Live Bill |
| Line item status `in_kitchen → on_table` | Customer Live Bill |
| New exception created | Admin Exceptions tab (badge count) |
| Payment received | Admin Table Detail (totals update) |
| Assistance requested | Admin Floor View (table goes red) |

---

## Open Decisions (require answer before Phase 3)

| # | Decision | Status |
|---|----------|--------|
| 1 | How does Customer reach Profile? | **RESOLVED:** When signed in, avatar icon appears in header. Tap → Profile (VBVOc) |
| 2 | Module config UI location | **UNRESOLVED:** Not sure yet — defer to Phase 3 |
| 3 | Promo Assignment nav source | UNRESOLVED — unclear from sketch |
| 4 | Admin login screen | UNRESOLVED — not in sketch, needed before Phase 4 |
| 5 | Pay Tab → "Pay for My Items" expanded state | **RESOLVED:** Not a separate screen. Expands in-place within the same Pay Tab screen (accordion behavior) |
| 6 | Pay Tab → "Custom Amount" expanded state | **RESOLVED:** Same — expands in-place, no separate screen |
| 7 | Kitchen Confirm tab state | UNRESOLVED — unclear from sketch |
| 8 | Success state after payment | UNRESOLVED — not in sketch |
| 9 | Success state after Send Request | UNRESOLVED — not in sketch |

---

*Phase 2 complete. Awaiting decisions on open items above before proceeding to Phase 3.*
