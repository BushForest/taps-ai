import { describe, expect, it } from "vitest";
import { buildCheckSnapshot, buildPayers } from "@taps/testing";
import { AllocationEngine } from "../../apps/api/src/modules/splits/allocation-engine";

describe("AllocationEngine", () => {
  const engine = new AllocationEngine();

  it("splits a check evenly without losing pennies", () => {
    const check = buildCheckSnapshot();
    const payers = buildPayers();
    const plan = engine.splitEvenly(check, payers);
    const totalAssigned = plan.entries.reduce((sum, entry) => sum + entry.assignedCents, 0);

    expect(totalAssigned).toBe(check.totalCents);
    expect(engine.computeRemainingBalance(check, plan)).toBe(0);
  });

  it("uses deterministic rounding for uneven equal splits", () => {
    const check = {
      ...buildCheckSnapshot(),
      totalCents: 100,
      amountPaidCents: 0,
      remainingBalanceCents: 100,
      subtotalCents: 100,
      taxCents: 0,
      assignmentSummary: {
        completeness: "unassigned" as const,
        assignedLineCents: 0,
        unassignedLineCents: 100,
        outstandingBalanceCents: 100,
        unassignedLineItemIds: ["line_pitcher"],
        unassignedTinyItemIds: []
      },
      lines: [
        {
          ...buildCheckSnapshot().lines.find((line) => line.id === "line_pitcher")!,
          extendedPriceCents: 100,
          grossCents: 100,
          taxCents: 0,
          assignedCents: 0
        }
      ]
    };
    const payers = buildPayers();
    const plan = engine.splitEvenly(check, payers);
    const totals = new Map<string, number>();

    for (const entry of plan.entries) {
      totals.set(entry.payerId, (totals.get(entry.payerId) ?? 0) + entry.assignedCents);
    }

    expect([...totals.values()].sort((left, right) => left - right)).toEqual([33, 33, 34]);
  });

  it("inherits modifier allocation from the parent item", () => {
    const check = buildCheckSnapshot();
    const plan = engine.assignItemsToPayer(check, "payer_a", ["line_burger"]);
    const burgerEntries = plan.entries.filter((entry) => entry.targetId === "line_burger");
    const cheddarEntries = plan.entries.filter((entry) => entry.targetId === "line_cheddar");

    expect(burgerEntries).toHaveLength(1);
    expect(cheddarEntries).toHaveLength(1);
    expect(cheddarEntries[0]?.payerId).toBe("payer_a");
    expect(cheddarEntries[0]?.inheritedFromParent).toBe(true);
  });

  it("supports 25/25/50 shared item allocation", () => {
    const check = buildCheckSnapshot();
    const plan = engine.fractionallyAllocateItem(check, "line_pitcher", [
      { payerId: "payer_a", basisPoints: 2500 },
      { payerId: "payer_b", basisPoints: 2500 },
      { payerId: "payer_c", basisPoints: 5000 }
    ]);

    const pitcherEntries = plan.entries.filter((entry) => entry.targetId === "line_pitcher");
    const totals = Object.fromEntries(pitcherEntries.map((entry) => [entry.payerId, entry.assignedCents]));

    expect(Object.values(totals).reduce((sum, value) => sum + value, 0)).toBe(2376);
    expect(totals.payer_a).toBe(594);
    expect(totals.payer_b).toBe(594);
    expect(totals.payer_c).toBe(1188);
  });

  it("keeps remainder visible for custom contributions", () => {
    const check = buildCheckSnapshot();
    const plan = engine.customAllocateAmount(check, "payer_a", 1200);
    const validation = engine.validateNoOrphanItems(check, plan);

    expect(engine.computeRemainingBalance(check, plan)).toBe(4200);
    expect(validation.canClose).toBe(false);
    expect(validation.unassignedLineItemIds.length).toBeGreaterThan(0);
  });

  it("leaves a visible remainder when paying by item and standalone condiments remain", () => {
    const check = buildCheckSnapshot();
    const plan = engine.assignItemsToPayer(check, "payer_a", ["line_burger", "line_fries"]);
    const validation = engine.validateNoOrphanItems(check, plan);

    expect(engine.computeRemainingBalance(check, plan)).toBeGreaterThan(0);
    expect(validation.canClose).toBe(false);
    expect(validation.unassignedLineItemIds).toContain("line_sauce");
    expect(validation.unassignedLineItemIds).toContain("line_pitcher");
  });
});
