# Taps Edge Case Matrix

| Scenario | Detection Trigger | Expected Behavior | Source of Truth | System Action |
| --- | --- | --- | --- | --- |
| Item added after split begins | Check snapshot version increments | Invalidate stale allocation plan, refresh guest UI, recompute remaining balance | POS for items, Taps for allocations | Mark allocation `invalidated`, emit `check.changed_detected` |
| Item voided before payment | POS check refresh shows voided line | Remove or mark line as voided and refresh allocations | POS | Refresh snapshot, update allocations, warn guests if their view is stale |
| Item voided after partial payment | POS shows void after one or more reconciled payments | Do not silently alter settled payer record; create reconciliation exception for over/under collection | POS for official bill, Taps for payment history | Open exception, calculate refund/credit recommendation |
| Payment succeeds in Taps but POS sync is delayed | Payment provider reports success but POS attach not confirmed | Show guest success with pending restaurant confirmation, block final close until reconciled | Payment provider for capture, POS for official attachment | Keep payment in `provider_succeeded_pending_pos`, enqueue reconciliation worker |
| POS closes check before Taps knows | Poll/webhook detects closed state first | Lock guest interactions, refresh snapshot, close session if balances reconcile | POS | Transition check to `closed`, session to `closing` or `closed` |
| Taps thinks table is open but POS transferred check | POS adapter reports transfer/new table binding | Retire old session from public use, remap or create new session based on transfer record | POS | Invoke `table_transfer_handler`, preserve audit chain |
| Two guests paying at same time | Concurrent payment initiation on same check version | Allow concurrent payers if allocations do not overlap; otherwise reject stale or conflicting plan | Taps for allocations, POS for official balance | Use allocation hash + check version concurrency guard |
| One guest pays custom amount and leaves remainder | Allocation below full balance | Accept payment if amount is valid and visible remainder remains | Taps for allocation, POS for remaining balance | Record partial payment, update remaining balance |
| Shared item split 25/25/50 | Fractional allocation plan submitted | Allocate line, tax, and fee share by basis points with deterministic rounding | Taps | Validate shares sum to 100%, apply rounding engine |
| Modifiers attached to parent item | Parent line has children | Modifier inherits parent payer unless explicitly overridden | Taps allocation model | Auto-attach modifier shares to parent allocation |
| Standalone condiment/add-on left unassigned | Unassigned standalone line exists | Prevent table close and highlight visible remainder | Taps | `validate_no_orphan_items` fails |
| Table cleared | Admin action or POS indicates table reset | Close/lock prior public session and allow next party fresh session | POS + Admin action | End session lifecycle, rotate public token |
| Table transferred | POS transfer event or staff operation | Move active dining context or close old session and attach new table session | POS | Create transfer record and remap session linkage |
| New party seated at same table while old session link still exists | New tap after prior closed session within audit retention | Never show old party data; create fresh public session token | Taps | Public access validation rejects old token, new session created |
| Stale guest session | Public token expired or session closed/archived | Show expired state with retap prompt | Taps | `validate_public_access` denies access |
| Payment pending then fails | Provider async failure after pending auth | Mark attempt failed, restore remaining balance, allow retry | Payment provider | `failed_payment_handler` updates payment state and audit trail |
| Payment partially succeeds | Provider captured lower amount or split tender outcome | Reflect actual captured amount and remaining balance accurately | Payment provider and POS | Reconcile partial capture, open exception if mismatch |
| Refund after closure | Support/admin or provider event | Preserve closed session, append refund event, adjust loyalty if policy requires | Payment provider for refund, Taps for audit | Record refund state, possibly open finance exception |
| Check reopened | POS reopens previously closed check | Reopen support-visible session or create linked reopen session; public access depends on timing/policy | POS | Transition session `reopened`, refresh check state |
| Check merged | POS merges checks | Retire prior check snapshot, map new source check, invalidate allocations | POS | Emit merge event and open sync note if needed |
| Check split in POS by staff | POS returns new check IDs | Invalidate guest allocations and attach relevant session/check relationship per new official structure | POS | Create exception if automatic remap is ambiguous |
| Rounding penny drift | Allocation engine computes fractional cents | Apply largest remainder algorithm; allow only strict tolerance at table close | Taps | Persist rounding decisions in allocation entries |
| Loyalty attached after payment | Guest submits phone after payment but before retention expiry | Link loyalty and award points retroactively if policy allows | Taps + Loyalty provider | Attach customer to completed session/payment |
| Loyalty skipped entirely | Guest never provides phone | Checkout continues without friction | Taps | No-op loyalty flow |
| Restaurant manually edits order from POS during active guest session | POS webhook/poll detects changed lines/totals | Invalidate stale guest checkout and refresh UI with explicit message | POS | Increment check version, emit refresh-required event |

## Blocking Close Conditions

The system must refuse final table close when any of the following is true:

- remaining balance exceeds tolerance
- unassigned standalone item or modifier remains
- payment attempt is still pending
- POS/Taps state mismatch is unresolved
- open reconciliation exception is marked blocking

## Recovery Priorities

1. Protect financial correctness.
2. Protect next-party privacy.
3. Preserve auditability.
4. Restore guest UX once state is trustworthy again.
