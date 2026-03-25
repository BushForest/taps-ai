# Taps Project Scope

## Vision

Taps is a customer-facing tableside commerce layer for restaurants. A guest taps an NFC tag at a physical table, lands in a fast web app, views the current menu and check, places orders where the restaurant enables it, pays all or part of the bill, optionally attaches loyalty by phone number, and exits without waiting on staff for every interaction.

Taps is not a replacement POS. It is an integration-first operating layer that sits on top of existing restaurant systems and keeps guest-facing state aligned with the restaurant's official order and financial records.

## Problem Statement

Restaurants want modern tableside ordering and payment without ripping out their POS, retraining their whole staff, or introducing financial drift between guest-facing and in-house systems. Existing solutions often fail on the hardest cases:

- split bills with modifiers and tiny add-ons
- partial payments with concurrent payers
- payment success before POS writeback completes
- manual POS edits during active guest sessions
- stale table links and new party turnover
- support and reconciliation when state disagrees across systems

Taps wins by being rigorous about session lifecycle, split allocation, synchronization, and auditability from day one.

## Product Goal

Deliver an MVP that lets a restaurant offer:

- NFC table entry
- guest menu access
- open check retrieval or creation
- tableside payment
- advanced split payment allocation
- loyalty capture by phone number
- POS synchronization and reconciliation
- safe session closure and expiry

## Target Users

### External users

- Guest diner paying from their phone
- Guest diner browsing menu before ordering
- Guest diner attaching loyalty during or after payment

### Internal restaurant users

- Server or bartender monitoring table state in POS
- Manager resolving sync or payment exceptions
- Support or finance staff reviewing audit trails

### Internal Taps users

- Ops/support team handling disputes and reconciliation
- Engineering team operating adapters, jobs, and observability

## Product Principles

1. POS remains source of truth for official check, item, and closed/paid state.
2. Taps owns guest session, payer identity, split intent, and guest-side temporary state.
3. Partial payer completion is allowed without prematurely closing the table.
4. Financial actions must be idempotent, replay-safe, and auditable.
5. Modifiers, condiments, and tiny charges cannot be stranded.
6. Session access must expire quickly for guests and longer for support.
7. Drift between Taps and POS must be detected, surfaced, and reconciled.

## In Scope For MVP

- NFC tag registry mapped to restaurant and table
- Session creation from tag tap
- Guest menu retrieval from POS-backed or mirrored catalog
- Open check retrieval from POS or POS-backed creation flow
- Internal normalized check snapshot with versioning
- Split allocation engine
- Payment orchestration with partial payment support
- Square-first POS adapter design and scaffold
- Stripe-compatible payment abstraction
- Phone-number loyalty capture and post-payment attachment
- Session close, public expiry, audit retention, and archive model
- Admin views for sessions, exceptions, table mappings, and payment audit
- Reconciliation jobs and exception queues

## Explicit Non-Goals For MVP

- Full restaurant POS replacement
- Kitchen display or kitchen routing system
- Full reservation/waitlist management
- Native mobile apps
- Marketing CRM automation beyond loyalty identity and points
- Hardware management beyond NFC registry metadata
- Deep multi-location financial reporting

## Assumptions

- Restaurants already operate an external POS that can expose at least one of: API, webhook, export, or polling surface.
- Square is the first adapter target because its API surface is practical for a first integration path.
- Not every restaurant will allow guest-side item ordering in MVP; menu-only and pay-only modes must be supported.
- Guest devices are modern mobile browsers and can complete 3DS or wallet redirects if required by payment provider.
- Staff may continue editing the order in POS during an active guest session.

## Constraints

- Taps must tolerate incomplete or provider-specific POS semantics.
- Public links must not expose historical table data to the next party.
- Payment operations must withstand retries, webhook duplication, and temporary provider outages.
- Session, check, and payment state must be inspectable by support without exposing unnecessary PII publicly.
- Build should remain startup-practical: a small team must be able to operate it.

## Success Metrics

- Tap-to-render menu time under 2 seconds on a warm path
- Payment initiation success above 99%
- Zero silent orphan line items at table close
- Zero undetected POS/Taps closed-state mismatches
- Support can explain every payment and sync event from audit logs
- Restaurants can onboard without replacing their POS

## Core Risks

- POS variability makes adapter design and reconciliation harder than the UI work
- Split payments create concurrency and rounding bugs if version guards are weak
- Payment success before POS sync can create guest confusion without explicit pending-writeback UX
- Session turnover at the same physical table can leak old context if link expiry is mishandled

## Strategic Tradeoffs

### Chosen

- Favor correctness and auditability over ultra-thin initial implementation.
- Favor adapter isolation over over-sharing provider logic across the core domain.
- Favor normalized internal models even when POS payloads differ.
- Favor a guest web app over native mobile for fast distribution and NFC compatibility.

### Deferred

- Rich personalization
- Cross-restaurant loyalty federation
- Autonomous AI features in the guest product
- Advanced restaurant analytics beyond event capture and exports

## Repo Intent

This repository is designed as a production-minded monorepo with:

- `docs/` for product and architecture truth
- `apps/` for guest, admin, and API applications
- `packages/` for shared contracts, domain logic, adapters, database, config, and observability
- `infra/` for deployment and infrastructure assets
- `scripts/` for developer and operations workflows
- `tests/` for unit, integration, contract, concurrency, and reconciliation coverage
