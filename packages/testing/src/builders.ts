import type { AllocationPlan, CheckSnapshot, Payer } from "@taps/contracts";

export function buildCheckSnapshot(): CheckSnapshot {
  return {
    id: "check_1",
    restaurantId: "rest_1",
    sessionId: "sess_1",
    posCheckId: "pos_check_1",
    sourceSystem: "memory_pos",
    sourceCheckVersion: "1",
    status: "open",
    currency: "USD",
    subtotalCents: 5000,
    taxCents: 400,
    feeCents: 0,
    discountCents: 0,
    totalCents: 5400,
    amountPaidCents: 0,
    remainingBalanceCents: 5400,
    assignmentSummary: {
      completeness: "unassigned",
      assignedLineCents: 0,
      unassignedLineCents: 5400,
      outstandingBalanceCents: 5400,
      unassignedLineItemIds: ["line_burger", "line_cheddar", "line_fries", "line_sauce", "line_pitcher"],
      unassignedTinyItemIds: ["line_cheddar", "line_sauce"]
    },
    version: 1,
    sourceUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: [
      {
        id: "line_burger",
        posLineId: "pos_line_1",
        kind: "item",
        name: "Smash Burger",
        quantity: 1,
        unitPriceCents: 1800,
        extendedPriceCents: 1800,
        status: "open",
        isStandalone: true,
        isModifier: false,
        taxCents: 144,
        feeCents: 0,
        grossCents: 1944,
        assignedCents: 0,
        childLineIds: ["line_cheddar"],
        assignmentStatus: "unassigned",
        isTinyCharge: false
      },
      {
        id: "line_cheddar",
        posLineId: "pos_line_1_mod_1",
        parentLineId: "line_burger",
        kind: "modifier",
        name: "Add Cheddar",
        quantity: 1,
        unitPriceCents: 150,
        extendedPriceCents: 150,
        status: "open",
        isStandalone: false,
        isModifier: true,
        taxCents: 12,
        feeCents: 0,
        grossCents: 162,
        assignedCents: 0,
        childLineIds: [],
        assignmentStatus: "unassigned",
        isTinyCharge: true
      },
      {
        id: "line_fries",
        posLineId: "pos_line_2",
        kind: "item",
        name: "Fries",
        quantity: 1,
        unitPriceCents: 700,
        extendedPriceCents: 700,
        status: "open",
        isStandalone: true,
        isModifier: false,
        taxCents: 56,
        feeCents: 0,
        grossCents: 756,
        assignedCents: 0,
        childLineIds: [],
        assignmentStatus: "unassigned",
        isTinyCharge: false
      },
      {
        id: "line_sauce",
        posLineId: "pos_line_3",
        kind: "condiment",
        name: "Chipotle Mayo",
        quantity: 1,
        unitPriceCents: 150,
        extendedPriceCents: 150,
        status: "open",
        isStandalone: true,
        isModifier: false,
        taxCents: 12,
        feeCents: 0,
        grossCents: 162,
        assignedCents: 0,
        childLineIds: [],
        assignmentStatus: "unassigned",
        isTinyCharge: true
      },
      {
        id: "line_pitcher",
        posLineId: "pos_line_4",
        kind: "item",
        name: "House Margarita Pitcher",
        quantity: 1,
        unitPriceCents: 2200,
        extendedPriceCents: 2200,
        status: "open",
        isStandalone: true,
        isModifier: false,
        taxCents: 176,
        feeCents: 0,
        grossCents: 2376,
        assignedCents: 0,
        childLineIds: [],
        assignmentStatus: "unassigned",
        isTinyCharge: false
      }
    ]
  };
}

export function buildPayers(): Payer[] {
  return [
    { id: "payer_a", sessionId: "sess_1", displayName: "Alex", status: "active" },
    { id: "payer_b", sessionId: "sess_1", displayName: "Blair", status: "active" },
    { id: "payer_c", sessionId: "sess_1", displayName: "Casey", status: "active" }
  ];
}

export function buildDraftAllocationPlan(): AllocationPlan {
  return {
    id: "alloc_1",
    sessionId: "sess_1",
    checkSnapshotId: "check_1",
    checkVersion: 1,
    status: "draft",
    strategy: "hybrid",
    allocationHash: "draft",
    version: 1,
    entries: [],
    createdAt: new Date().toISOString()
  };
}
