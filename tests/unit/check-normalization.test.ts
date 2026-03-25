import { describe, expect, it } from "vitest";
import { buildCheckSnapshot, buildDraftAllocationPlan } from "@taps/testing";
import { CheckAgent } from "../../apps/api/src/modules/checks/check-agent";
import { InMemoryDomainEventBus } from "../../apps/api/src/modules/events/domain-event-bus";

describe("Check normalization", () => {
  const checkAgent = new CheckAgent(
    { findLatestBySession: async () => null, save: async (snapshot) => snapshot },
    { record: async () => {} },
    new InMemoryDomainEventBus(),
    {} as never
  );

  it("attaches modifier children and tiny-item flags in the normalized snapshot", () => {
    const normalized = checkAgent.buildGuestCheckSnapshot(buildCheckSnapshot());
    const burger = normalized.lines.find((line) => line.id === "line_burger");
    const cheddar = normalized.lines.find((line) => line.id === "line_cheddar");
    const sauce = normalized.lines.find((line) => line.id === "line_sauce");

    expect(burger?.childLineIds).toContain("line_cheddar");
    expect(cheddar?.isTinyCharge).toBe(true);
    expect(sauce?.isTinyCharge).toBe(true);
    expect(normalized.assignmentSummary.unassignedTinyItemIds).toEqual(["line_cheddar", "line_sauce"]);
  });

  it("reflects assignment completeness when a plan is applied", () => {
    const check = buildCheckSnapshot();
    const plan = buildDraftAllocationPlan();
    plan.entries = [
      {
        id: "entry_1",
        payerId: "payer_a",
        targetType: "line_item",
        targetId: "line_burger",
        shareBasisPoints: 10000,
        assignedCents: 1944
      },
      {
        id: "entry_2",
        payerId: "payer_a",
        targetType: "line_item",
        targetId: "line_cheddar",
        shareBasisPoints: 10000,
        assignedCents: 162
      }
    ];

    const normalized = checkAgent.buildGuestCheckSnapshot(check, plan);

    expect(normalized.assignmentSummary.completeness).toBe("partially_assigned");
    expect(normalized.assignmentSummary.assignedLineCents).toBe(2106);
    expect(normalized.lines.find((line) => line.id === "line_burger")?.assignmentStatus).toBe("fully_assigned");
  });
});
