import type { AllocationPlan, CheckSnapshot, CloseValidationResult, Payer } from "@taps/contracts";
import { ConflictError } from "../../lib/errors";
import type { AllocationPlanRepository } from "../repositories";
import { AllocationEngine } from "./allocation-engine";

export class SplitPaymentAgent {
  constructor(
    private readonly engine: AllocationEngine,
    private readonly plans: AllocationPlanRepository
  ) {}

  async splitEvenly(check: CheckSnapshot, payers: Payer[], existingPlan?: AllocationPlan): Promise<AllocationPlan> {
    return this.plans.save(this.engine.splitEvenly(check, payers, existingPlan));
  }

  async assignItemsToPayer(
    check: CheckSnapshot,
    payerId: string,
    lineItemIds: string[],
    existingPlan?: AllocationPlan
  ): Promise<AllocationPlan> {
    return this.plans.save(this.engine.assignItemsToPayer(check, payerId, lineItemIds, existingPlan));
  }

  async fractionallyAllocateItem(
    check: CheckSnapshot,
    lineItemId: string,
    shares: Array<{ payerId: string; basisPoints: number }>,
    existingPlan?: AllocationPlan
  ): Promise<AllocationPlan> {
    return this.plans.save(this.engine.fractionallyAllocateItem(check, lineItemId, shares, existingPlan));
  }

  async customAllocateAmount(
    check: CheckSnapshot,
    payerId: string,
    amountCents: number,
    existingPlan?: AllocationPlan
  ): Promise<AllocationPlan> {
    return this.plans.save(this.engine.customAllocateAmount(check, payerId, amountCents, existingPlan));
  }

  computeRemainingBalance(check: CheckSnapshot, plan: AllocationPlan): number {
    return this.engine.computeRemainingBalance(check, plan);
  }

  validateNoOrphanItems(check: CheckSnapshot, plan: AllocationPlan): CloseValidationResult {
    return this.engine.validateNoOrphanItems(check, plan);
  }

  enforceCloseRules(input: {
    check: CheckSnapshot;
    plan: AllocationPlan;
    hasPendingPayments: boolean;
    hasBlockingMismatch: boolean;
    closeToleranceCents?: number;
  }): CloseValidationResult {
    const validation = this.engine.validateNoOrphanItems(input.check, input.plan);
    const tolerance = input.closeToleranceCents ?? 1;
    const reasons = [...validation.reasons];

    if (validation.remainingBalanceCents > tolerance) {
      reasons.push(`Remaining balance ${validation.remainingBalanceCents} exceeds tolerance ${tolerance}`);
    }

    if (input.hasPendingPayments) {
      reasons.push("Pending payment attempt still exists");
    }

    if (input.hasBlockingMismatch) {
      reasons.push("Blocking POS/Taps reconciliation mismatch exists");
    }

    return {
      ...validation,
      canClose: validation.canClose && !input.hasPendingPayments && !input.hasBlockingMismatch,
      reasons
    };
  }

  assertFreshCheckVersion(expectedVersion: number, currentCheck: CheckSnapshot): void {
    if (expectedVersion !== currentCheck.version) {
      throw new ConflictError(
        `Stale check version ${expectedVersion}; current version is ${currentCheck.version}`,
        "STALE_CHECK_VERSION"
      );
    }
  }
}
