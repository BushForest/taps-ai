import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";
import type { CheckSnapshot } from "@taps/contracts";

async function createSessionWithCheck(container: ReturnType<typeof createContainer>) {
  const context = {
    correlationId: newId("corr"),
    restaurantId: container.restaurantConfig.id,
    actor: { type: "guest" as const, id: "guest_demo" }
  };

  const session = await container.agents.sessionAgent.createSession(
    "demo-table-12",
    container.restaurantConfig.posProviderKey,
    context,
    {
      publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
      supportRetentionDays: container.restaurantConfig.supportRetentionDays
    }
  );

  const check = await container.agents.checkAgent.fetchOrCreateOpenCheck(
    container.restaurantConfig.posProviderKey,
    { ...context, restaurantId: session.restaurantId },
    session,
    true
  );

  return { session, check, context };
}

function standaloneLineIds(check: CheckSnapshot): string[] {
  return check.lines
    .filter((line) => !line.parentLineId && !["voided", "cancelled", "transferred"].includes(line.status))
    .map((line) => line.id);
}

describe("Session close with orphan items", () => {
  it("blocks close when unassigned standalone items remain on the check", async () => {
    const container = createContainer();
    const { check } = await createSessionWithCheck(container);
    const allLines = standaloneLineIds(check);
    const [firstLine, ...rest] = allLines;

    // Assign only the first standalone item — rest are unassigned
    const plan = await container.agents.splitAgent.assignItemsToPayer(check, "payer_a", [firstLine!]);
    const validation = container.agents.splitAgent.validateNoOrphanItems(check, plan);

    expect(validation.canClose).toBe(false);
    expect(validation.unassignedLineItemIds.length).toBeGreaterThan(0);
    for (const id of rest) {
      expect(validation.unassignedLineItemIds).toContain(id);
    }
  });

  it("reports no unassigned items when all standalone items are fully assigned", async () => {
    const container = createContainer();
    const { check } = await createSessionWithCheck(container);
    const allLines = standaloneLineIds(check);

    // Assign ALL standalone items to payer_a
    const plan = await container.agents.splitAgent.assignItemsToPayer(check, "payer_a", allLines);
    const validation = container.agents.splitAgent.validateNoOrphanItems(check, plan);

    // All items assigned → no orphan line items (canClose also requires balance paid)
    expect(validation.unassignedLineItemIds).toHaveLength(0);
    // Balance is still non-zero (payments not yet captured), so canClose is false
    expect(validation.remainingBalanceCents).toBeGreaterThan(0);
  });

  it("blocks close when a pending payment exists even if all items are assigned", async () => {
    const container = createContainer();
    const { check } = await createSessionWithCheck(container);
    const allLines = standaloneLineIds(check);

    const plan = await container.agents.splitAgent.assignItemsToPayer(check, "payer_a", allLines);
    const normalized = container.agents.checkAgent.buildGuestCheckSnapshot(check, plan);

    const closeResult = container.agents.splitAgent.enforceCloseRules({
      check: normalized,
      plan,
      hasPendingPayments: true, // simulate in-flight payment
      hasBlockingMismatch: false
    });

    expect(closeResult.canClose).toBe(false);
    expect(closeResult.reasons.some((r) => /pending/i.test(r))).toBe(true);
  });

  it("reports blocking mismatch when a reconciliation exception exists", async () => {
    const container = createContainer();
    const { check } = await createSessionWithCheck(container);
    const allLines = standaloneLineIds(check);

    const plan = await container.agents.splitAgent.assignItemsToPayer(check, "payer_a", allLines);
    const normalized = container.agents.checkAgent.buildGuestCheckSnapshot(check, plan);

    const closeResult = container.agents.splitAgent.enforceCloseRules({
      check: normalized,
      plan,
      hasPendingPayments: false,
      hasBlockingMismatch: true // open reconciliation exception
    });

    expect(closeResult.canClose).toBe(false);
    expect(closeResult.reasons.some((r) => /mismatch|exception/i.test(r))).toBe(true);
  });
});
