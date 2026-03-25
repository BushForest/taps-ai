export interface RoundingShare {
  targetId: string;
  basisPoints: number;
}

export function allocateByBasisPoints(totalCents: number, shares: RoundingShare[]): Map<string, number> {
  const exact = shares.map((share) => ({
    ...share,
    exact: (totalCents * share.basisPoints) / 10_000
  }));

  const floorTotal = exact.reduce((sum, share) => sum + Math.floor(share.exact), 0);
  let remainder = totalCents - floorTotal;

  const sorted = [...exact].sort((left, right) => {
    const fractionalDelta = right.exact - Math.floor(right.exact) - (left.exact - Math.floor(left.exact));
    if (fractionalDelta !== 0) {
      return fractionalDelta > 0 ? 1 : -1;
    }

    return left.targetId.localeCompare(right.targetId);
  });

  const allocations = new Map<string, number>(
    exact.map((share) => [share.targetId, Math.floor(share.exact)])
  );

  for (const share of sorted) {
    if (remainder <= 0) {
      break;
    }

    allocations.set(share.targetId, (allocations.get(share.targetId) ?? 0) + 1);
    remainder -= 1;
  }

  return allocations;
}
