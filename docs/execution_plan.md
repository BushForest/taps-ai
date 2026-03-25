# Taps Execution Plan

## Delivery Strategy

Build Taps in layers:

1. lock product and architecture decisions in docs
2. scaffold a monorepo with strong contracts and domain boundaries
3. implement the highest-risk MVP flows first
4. wire providers behind adapters rather than leak provider logic into the core
5. instrument reconciliation and audit from the first working flow

## MVP Definition

MVP includes:

- NFC tap to active session
- menu retrieval
- open check retrieval or creation
- split allocation engine
- payment orchestration with partial payments
- Square-first POS sync scaffold
- phone loyalty capture
- session close, expiry, and audit retention
- admin views for sessions, tables, payment audit, and sync exceptions

MVP explicitly defers:

- broad multi-provider parity beyond Square-first design
- deep restaurant analytics product
- native mobile apps
- advanced marketing automation
- kitchen/ops modules beyond current POS sync

## Phased Roadmap

## Phase 0: Foundations

- choose stack and monorepo layout
- define contracts, naming, and event conventions
- stand up database schema, config, and observability package
- decide first deployment target

## Phase 1: Product And Architecture Truth

- `project_scope.md`
- `functional_spec.md`
- `architecture.md`
- `domain_model.md`
- `edge_case_matrix.md`
- `execution_plan.md`

Exit criteria:

- major business rules are documented
- truth boundaries between POS and Taps are explicit
- state machines and edge-case rules are locked

## Phase 2: Repository Scaffold

- create `apps/`, `packages/`, `infra/`, `scripts/`, `tests/`
- scaffold API app, customer web, and admin web
- add domain packages, MCP contracts, DB schema, worker stubs, test scaffolding
- define provider interfaces and Square-first placeholders

Exit criteria:

- repo structure supports immediate implementation work
- interfaces compile conceptually even before external credentials exist

## Phase 3: Highest-Priority Flow Implementation

### 3.1 NFC Table Session Creation

- tag lookup
- session creation/reuse policy
- public token issuance
- session expiry validation

### 3.2 Menu Retrieval

- menu fetch through POS or mirror
- normalization and modifier attachment
- availability and snapshot versioning

### 3.3 Check Retrieval

- fetch or create open check
- internal snapshot builder
- versioning and change detection

### 3.4 Split Payment Allocation Engine

- equal split
- item assignment
- fractional split
- custom amount
- hybrid support
- orphan prevention
- remainder rules

### 3.5 Payment Orchestration

- idempotent payment intent creation
- authorization/capture lifecycle
- pending/failure handling
- POS writeback tracking

### 3.6 POS Sync

- webhook ingestion
- polling reconciliation
- change detection
- close/transfer detection

### 3.7 Loyalty Phone Capture

- phone normalization
- profile lookup/create
- session attachment
- points award path

### 3.8 Session Close And Expiry

- close validation
- public grace expiry
- audit retention window
- archive job

Exit criteria:

- core flows operate end to end behind adapters
- failure and stale-state paths are first-class
- audit trail exists for all financial actions

## Phase 4: Pilot Hardening

- load tests
- provider contract tests
- operational dashboards
- admin exception tooling improvements
- launch runbooks

## Critical Path

1. normalized domain model
2. POS adapter contract
3. check snapshot + versioning
4. split allocation engine
5. payment orchestration + idempotency
6. reconciliation workflows
7. session close/expiry safety

If these are weak, the rest of the product is cosmetic.

## Build Order Recommendation

1. Domain contracts and schema
2. Session + check retrieval
3. Split allocation engine
4. Payment orchestration
5. POS webhook/poll reconciliation
6. Loyalty attachment
7. Admin exception workflows
8. UX polish and onboarding flows

## Risks To Address Early

- provider-specific POS semantics
- simultaneous payer race conditions
- POS/manual edits invalidating checkout
- post-capture, pre-writeback ambiguity
- session privacy at table turnover

## Testing Milestones

- unit coverage on allocation math and state guards
- integration tests on session/check/payment flows
- contract tests per provider adapter
- concurrency tests on parallel payment attempts
- reconciliation tests on delayed writeback and closed-state drift

## What To Defer Until After MVP

- broader POS adapter library
- advanced offers and promotions
- cross-location loyalty and CRM
- richer staff tooling beyond exceptions and audit
- automated payout/accounting exports

## Immediate Next Steps

1. complete repository scaffold
2. implement shared contracts and domain logic
3. stand up DB schema and route skeletons
4. wire first-flow stubs through API and frontend
5. document remaining provider-specific TODOs
