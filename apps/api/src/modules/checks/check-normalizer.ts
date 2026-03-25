import type {
  AllocationPlan,
  CheckAssignmentCompleteness,
  CheckAssignmentSummary,
  CheckLineItem,
  CheckSnapshot
} from "@taps/contracts";

function lineGross(line: CheckLineItem): number {
  return line.extendedPriceCents + (line.taxCents ?? 0) + (line.feeCents ?? 0);
}

function isTinyCharge(line: CheckLineItem): boolean {
  return line.kind === "modifier" || line.kind === "condiment" || lineGross(line) <= 250;
}

function buildLineAssignmentStatus(assignedCents: number, grossCents: number): CheckAssignmentCompleteness {
  if (assignedCents <= 0) {
    return "unassigned";
  }

  if (assignedCents < grossCents) {
    return "partially_assigned";
  }

  return "fully_assigned";
}

function buildAssignmentSummary(lines: CheckLineItem[], remainingBalanceCents: number): CheckAssignmentSummary {
  const assignedLineCents = lines.reduce((sum, line) => {
    return sum + line.assignedCents;
  }, 0);

  const unassignedLineItemIds = lines
    .filter((line) => line.assignmentStatus !== "fully_assigned")
    .map((line) => line.id);

  const unassignedTinyItemIds = lines
    .filter((line) => line.assignmentStatus !== "fully_assigned" && line.isTinyCharge)
    .map((line) => line.id);

  const unassignedLineCents = lines.reduce((sum, line) => {
    if (line.assignmentStatus === "fully_assigned") {
      return sum;
    }

    return sum + Math.max(line.grossCents - line.assignedCents, 0);
  }, 0);

  let completeness: CheckAssignmentCompleteness = "unassigned";
  if (unassignedLineItemIds.length === 0) {
    completeness = "fully_assigned";
  } else if (assignedLineCents > 0) {
    completeness = "partially_assigned";
  }

  return {
    completeness,
    assignedLineCents,
    unassignedLineCents,
    outstandingBalanceCents: remainingBalanceCents,
    unassignedLineItemIds,
    unassignedTinyItemIds
  };
}

function planAppliesToSnapshot(snapshot: CheckSnapshot, plan?: AllocationPlan | null): plan is AllocationPlan {
  if (!plan || plan.sessionId !== snapshot.sessionId) {
    return false;
  }

  if (plan.checkSnapshotId === snapshot.id && plan.checkVersion === snapshot.version) {
    return true;
  }

  const currentLineIds = new Set(snapshot.lines.map((line) => line.id));
  return plan.entries
    .filter((entry) => entry.targetType === "line_item" && entry.targetId !== "remaining")
    .every((entry) => currentLineIds.has(entry.targetId));
}

export function normalizeCheckSnapshot(snapshot: CheckSnapshot, allocationPlan?: AllocationPlan | null): CheckSnapshot {
  const childLineIdsByParent = new Map<string, string[]>();
  const lineAssignments = new Map<string, number>();
  const applicablePlan = planAppliesToSnapshot(snapshot, allocationPlan) ? allocationPlan : undefined;

  for (const line of snapshot.lines) {
    if (!line.parentLineId) {
      continue;
    }

    const currentChildren = childLineIdsByParent.get(line.parentLineId) ?? [];
    currentChildren.push(line.id);
    childLineIdsByParent.set(line.parentLineId, currentChildren);
  }

  if (applicablePlan) {
    for (const entry of applicablePlan.entries) {
      if (entry.targetType !== "line_item" || entry.targetId === "remaining") {
        continue;
      }

      lineAssignments.set(entry.targetId, (lineAssignments.get(entry.targetId) ?? 0) + entry.assignedCents);
    }
  }

  const lines = snapshot.lines.map((line) => {
    const grossCents = lineGross(line);
    const assignedCents = lineAssignments.get(line.id) ?? 0;
    return {
      ...line,
      grossCents,
      assignedCents,
      childLineIds: childLineIdsByParent.get(line.id) ?? [],
      assignmentStatus: buildLineAssignmentStatus(assignedCents, grossCents),
      isTinyCharge: isTinyCharge(line)
    };
  });

  return {
    ...snapshot,
    sourceSystem: snapshot.sourceSystem || "unknown",
    sourceCheckVersion: snapshot.sourceCheckVersion ?? String(snapshot.version),
    amountPaidCents: Math.max(snapshot.amountPaidCents ?? 0, snapshot.totalCents - snapshot.remainingBalanceCents, 0),
    assignmentSummary: buildAssignmentSummary(lines, snapshot.remainingBalanceCents),
    lines
  };
}
