import type { AllocationPlan, AllocationSummary, CheckLineItem, CheckSnapshot, CloseValidationResult, Payer } from "@taps/contracts";
import { ConflictError } from "../../lib/errors";
import { buildStableHash, newId } from "../../lib/idempotency";
import { allocateByBasisPoints } from "./rounding-engine";

type LineShare = { payerId: string; basisPoints: number };

interface LineFamily {
  root: CheckLineItem;
  members: CheckLineItem[];
}

export class AllocationEngine {
  splitEvenly(check: CheckSnapshot, payers: Payer[], existingPlan?: AllocationPlan): AllocationPlan {
    if (payers.length === 0) {
      throw new ConflictError("At least one payer is required to split evenly");
    }

    let plan = this.basePlan(check, "even", existingPlan);
    const shares = payers.map((payer) => ({
      payerId: payer.id,
      basisPoints: Math.floor(10_000 / payers.length)
    }));
    const distributedBasisPoints = shares.reduce((sum, share) => sum + share.basisPoints, 0);
    shares[0]!.basisPoints += 10_000 - distributedBasisPoints;

    for (const family of this.lineFamilies(check)) {
      plan = this.applyFamilyShares(plan, family, shares);
    }

    return this.finalize(plan);
  }

  assignItemsToPayer(
    check: CheckSnapshot,
    payerId: string,
    lineItemIds: string[],
    existingPlan?: AllocationPlan
  ): AllocationPlan {
    let plan = this.basePlan(check, existingPlan?.strategy ?? "by_item", existingPlan);

    for (const lineItemId of lineItemIds) {
      const family = this.findFamilyForLine(check, lineItemId);
      plan = this.applyFamilyShares(plan, family, [{ payerId, basisPoints: 10_000 }]);
    }

    return this.finalize(plan);
  }

  fractionallyAllocateItem(
    check: CheckSnapshot,
    lineItemId: string,
    shares: Array<{ payerId: string; basisPoints: number }>,
    existingPlan?: AllocationPlan
  ): AllocationPlan {
    const sum = shares.reduce((total, share) => total + share.basisPoints, 0);
    if (sum !== 10_000) {
      throw new ConflictError(`Fractional split for ${lineItemId} must sum to 10000 basis points`);
    }

    const family = this.findFamilyForLine(check, lineItemId);
    const plan = this.applyFamilyShares(this.basePlan(check, "fractional", existingPlan), family, shares);
    return this.finalize(plan);
  }

  customAllocateAmount(
    check: CheckSnapshot,
    payerId: string,
    amountCents: number,
    existingPlan?: AllocationPlan
  ): AllocationPlan {
    const plan = this.basePlan(check, existingPlan?.strategy ?? "custom_amount", existingPlan);
    const remaining = this.computeRemainingBalance(check, plan);

    if (amountCents <= 0 || amountCents > remaining) {
      throw new ConflictError(`Custom contribution ${amountCents} must be between 1 and ${remaining}`);
    }

    plan.entries.push({
      id: newId("alloc"),
      payerId,
      targetType: "remaining_balance",
      targetId: "remaining",
      shareBasisPoints: 10_000,
      assignedCents: amountCents
    });

    return this.finalize(plan);
  }

  computeRemainingBalance(check: CheckSnapshot, plan: AllocationPlan): number {
    const totalAssigned = plan.entries.reduce((sum, entry) => sum + entry.assignedCents, 0);
    return Math.max(check.remainingBalanceCents - totalAssigned, 0);
  }

  summarizeByPayer(plan: AllocationPlan): AllocationSummary[] {
    const grouped = new Map<string, AllocationSummary>();

    for (const entry of plan.entries) {
      const existing = grouped.get(entry.payerId) ?? {
        payerId: entry.payerId,
        assignedLineItemIds: [],
        amountCents: 0
      };

      if (entry.targetType === "line_item" && entry.targetId !== "remaining") {
        existing.assignedLineItemIds.push(entry.targetId);
      }

      existing.amountCents += entry.assignedCents;
      grouped.set(entry.payerId, existing);
    }

    return [...grouped.values()];
  }

  validateNoOrphanItems(check: CheckSnapshot, plan: AllocationPlan): CloseValidationResult {
    const remainingBalanceCents = check.remainingBalanceCents;
    const lineAssignments = new Map<string, number>();

    for (const entry of plan.entries) {
      if (entry.targetType !== "line_item" || entry.targetId === "remaining") {
        continue;
      }

      lineAssignments.set(entry.targetId, (lineAssignments.get(entry.targetId) ?? 0) + entry.assignedCents);
    }

    const unassignedLineItemIds = remainingBalanceCents > 0
      ? this.payableLines(check)
          .filter((line) => (lineAssignments.get(line.id) ?? 0) < this.lineGross(line))
          .map((line) => line.id)
      : [];

    return {
      canClose: unassignedLineItemIds.length === 0,
      reasons: [
        ...(unassignedLineItemIds.length ? ["Unassigned payable items remain"] : [])
      ],
      unassignedLineItemIds,
      remainingBalanceCents,
      toleranceExceededByCents: remainingBalanceCents > 1 ? remainingBalanceCents - 1 : 0
    };
  }

  private applyFamilyShares(plan: AllocationPlan, family: LineFamily, shares: LineShare[]): AllocationPlan {
    const familyTargetIds = new Set(family.members.map((member) => member.id));
    plan.entries = plan.entries.filter(
      (entry) => entry.targetType !== "line_item" || !familyTargetIds.has(entry.targetId as string)
    );

    for (const member of family.members) {
      const memberAllocations = allocateByBasisPoints(
        this.lineGross(member),
        shares.map((share) => ({ targetId: share.payerId, basisPoints: share.basisPoints }))
      );

      for (const share of shares) {
        const assignedCents = memberAllocations.get(share.payerId) ?? 0;
        if (assignedCents === 0) {
          continue;
        }

        plan.entries.push({
          id: newId("alloc"),
          payerId: share.payerId,
          targetType: "line_item",
          targetId: member.id,
          shareBasisPoints: share.basisPoints,
          assignedCents,
          inheritedFromParent: member.parentLineId === family.root.id
        });
      }
    }

    return plan;
  }

  private basePlan(check: CheckSnapshot, strategy: AllocationPlan["strategy"], existingPlan?: AllocationPlan): AllocationPlan {
    const reusablePlan = existingPlan?.checkVersion === check.version ? existingPlan : undefined;
    return {
      id: reusablePlan?.id ?? newId("plan"),
      sessionId: check.sessionId,
      checkSnapshotId: check.id,
      checkVersion: check.version,
      status: "proposed",
      strategy,
      allocationHash: reusablePlan?.allocationHash ?? "draft",
      version: (reusablePlan?.version ?? 0) + 1,
      createdByPayerId: reusablePlan?.createdByPayerId,
      entries: reusablePlan ? [...reusablePlan.entries] : [],
      createdAt: reusablePlan?.createdAt ?? new Date().toISOString()
    };
  }

  private finalize(plan: AllocationPlan): AllocationPlan {
    return {
      ...plan,
      allocationHash: buildStableHash(
        [...plan.entries]
          .sort((left, right) => `${left.targetId}:${left.payerId}`.localeCompare(`${right.targetId}:${right.payerId}`))
          .map((entry) => ({
            payerId: entry.payerId,
            targetType: entry.targetType,
            targetId: entry.targetId,
            shareBasisPoints: entry.shareBasisPoints,
            assignedCents: entry.assignedCents
          }))
      )
    };
  }

  private lineFamilies(check: CheckSnapshot): LineFamily[] {
    const linesByParent = new Map<string, CheckLineItem[]>();
    const roots = this.payableLines(check).filter((line) => !line.parentLineId);

    for (const line of this.payableLines(check).filter((candidate) => Boolean(candidate.parentLineId))) {
      const parentId = line.parentLineId!;
      const children = linesByParent.get(parentId) ?? [];
      children.push(line);
      linesByParent.set(parentId, children);
    }

    return roots.map((root) => ({
      root,
      members: [root, ...(linesByParent.get(root.id) ?? [])]
    }));
  }

  private findFamilyForLine(check: CheckSnapshot, lineItemId: string): LineFamily {
    const family = this.lineFamilies(check).find((candidate) => candidate.members.some((member) => member.id === lineItemId));
    if (!family) {
      throw new ConflictError(`Line item ${lineItemId} is not payable or not found`);
    }

    return family;
  }

  private payableLines(check: CheckSnapshot): CheckLineItem[] {
    return check.lines.filter((line) => !["voided", "cancelled", "transferred"].includes(line.status));
  }

  private lineGross(line: CheckLineItem): number {
    return line.extendedPriceCents + (line.taxCents ?? 0) + (line.feeCents ?? 0);
  }
}
