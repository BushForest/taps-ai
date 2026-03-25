# Taps Functional Specification

## User Roles

### Guest diner

- Opens a session from an NFC tag
- Views menu and current check
- Places eligible orders
- Splits and pays all or part of the bill
- Adds tip
- Attaches loyalty by phone number

### Restaurant manager

- Configures NFC to table mappings
- Reviews live sessions
- Resolves payment and sync exceptions
- Reviews audit history

### Restaurant staff

- Continues using the POS as operational source of truth
- May transfer, reopen, void, merge, or split checks in POS

### Taps support/ops

- Investigates audit trails
- Reconciles delayed or failed provider writeback
- Assists with disputes, refunds, or recovery

## Core Use Cases

## 1. Tap Into Session

Preconditions:

- NFC tag is registered to a restaurant and table
- Restaurant is active

Flow:

1. Guest taps NFC tag.
2. Taps validates the tag and table mapping.
3. Taps creates or reuses the correct active dining session.
4. Guest lands on the session home screen.
5. App loads menu availability and open check snapshot.

Rules:

- NFC tags are permanent identifiers.
- Physical tables are permanent records.
- Sessions are temporary and rotate between parties.
- Public access to a closed session must expire after grace period.

## 2. View Menu

Flow:

1. Guest opens menu for the active table session.
2. Menu Agent requests POS-sourced menu or mirror menu.
3. Menu is normalized into Taps model.
4. Availability, modifiers, and condiments are attached.
5. Guest sees a price-stamped menu snapshot for that session.

Rules:

- Prices displayed at checkout must be tied to a versioned snapshot.
- POS availability changes must be reflected on refresh.
- If POS menu is unavailable, mirrored menu may serve only where restaurant is configured for fallback.

## 3. Retrieve Or Create Check

Flow:

1. Guest opens the check screen.
2. Taps asks POS for the current open check for the table.
3. If allowed and no check exists, Taps requests creation through the POS adapter.
4. Taps maps the POS check to a normalized internal snapshot.
5. Snapshot is versioned and exposed to guest UI.

Rules:

- POS is official source of check totals and item state.
- Taps snapshot is a read-optimized mirror with allocation metadata.
- Any stale checkout screen must be invalidated when check version changes.

## 4. Split The Bill

Supported split modes:

- even split across active payers
- pay by item
- fractional item split, including 25/25/50
- custom dollar allocation
- hybrid split combining item assignment and dollar top-ups

Rules:

- Parent-child modifier relationships must remain intact by default.
- Standalone add-ons must be explicitly assigned or remain in unallocated remainder.
- Remaining balance must never be hidden.
- Close validation must reject unresolved orphan items, negative balances, or drift beyond rounding tolerance.

## 5. Pay

Flow:

1. Guest selects or confirms their allocation.
2. Taps validates check version and outstanding balance.
3. Taps creates a payment intent with idempotency key.
4. Guest completes authorization.
5. Taps captures payment or marks failure/pending.
6. Taps writes payment back to POS where supported.
7. Taps reconciles provider payment state with POS and internal check balance.

Rules:

- A payer can finish while the table remains open.
- Pending payments block final table close.
- Delayed POS writeback must surface as pending reconciliation, not silent success.
- Refunds and voids must remain auditable and tied to original payment records.

## 6. Attach Loyalty

Flow:

1. Guest optionally enters phone number.
2. Phone is normalized and matched to existing profile or creates a new one.
3. Loyalty is linked to the session and eligible payments.
4. Points or rewards are awarded after successful completion criteria.

Rules:

- Loyalty is optional and must not block checkout.
- Loyalty can be attached after payment if session remains within support/audit retention.
- Phone numbers must be stored and displayed under privacy controls.

## 7. Close And Expire Session

Flow:

1. POS and Taps agree check is fully paid and closed.
2. Session transitions to closed.
3. Public guest access remains available for a short grace window.
4. Public access expires and session is locked.
5. Support/audit access remains available for longer retention.
6. Session archives after retention policy threshold.

Rules:

- Table closure requires zero remaining balance or strict rounding tolerance only.
- No pending payments or unresolved mismatches may remain.
- New party at same table must receive a fresh session token and context.

## Business Rules

1. POS is source of truth for official order state, item state, and closed/paid state.
2. Taps is source of truth for payer identities, allocations, session metadata, and loyalty linkage.
3. If check contents change while a payer is in checkout, the payer's stale client state must be rejected and refreshed.
4. Payment attempts require idempotency keys scoped to session, payer, amount, and check version.
5. Public session URLs must be revocable without deleting audit history.
6. Closed session public access must expire faster than support audit access.
7. Manual restaurant POS edits are expected and must feed refresh/reconciliation logic.

## Guest UX Requirements

- QR/NFC landing must be fast and mobile-first.
- Guests must always see current bill version and freshness status.
- If the bill changes during checkout, the UI must block payment completion and require refresh.
- Split UI must clearly show what the guest is paying, what remains, and whether modifiers are included.
- Payment writeback delays must show a clear pending confirmation state.
- Session expiry must show a safe message and allow retap/reopen path rather than exposing stale data.

## Admin UX Requirements

- Managers need live session list per restaurant.
- Managers need sync exception queue with recommended actions.
- Managers need table map and NFC assignment tools.
- Managers need payment audit by session, check, and provider reference.
- Managers need to see whether a table is publicly expired, audit-only, or archived.

## Retention Requirements

- Public session data: short-lived grace retention after close
- Support session data: limited support/audit retention
- Financial and audit data: retained per policy and compliance needs
- Event logs and reconciliation records: retained longer than public session access

## Security Requirements

- Public access uses session-scoped tokens, not raw table IDs alone.
- Admin APIs require restaurant-admin or Taps-internal authorization.
- Provider secrets must remain server-side only.
- Audit trails must record actor, action, subject, idempotency key, and timestamp.
- Webhooks must verify provider signatures and be replay-safe.

## Open Questions / TODOs

- Square payment attachment semantics vary by restaurant payment setup and need adapter confirmation.
- Some POS providers may not support true table-bound open check lookup; polling and heuristic matching may be needed.
- Ordering flow enablement should be restaurant-configurable by service mode.
