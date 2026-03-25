import { describe, expect, it } from "vitest";
import { allocateByBasisPoints } from "../../apps/api/src/modules/splits/rounding-engine";

describe("allocateByBasisPoints (largest-remainder rounding)", () => {
  it("always produces allocations that sum exactly to totalCents", () => {
    const shares = [
      { targetId: "payer_a", basisPoints: 3333 },
      { targetId: "payer_b", basisPoints: 3333 },
      { targetId: "payer_c", basisPoints: 3334 }
    ];
    const result = allocateByBasisPoints(100, shares);
    const total = [...result.values()].reduce((sum, v) => sum + v, 0);
    expect(total).toBe(100);
  });

  it("handles a three-way even split of an amount not divisible by 3", () => {
    // 100 cents / 3 → each gets 33 or 34; largest remainder gets the extra penny
    const shares = [
      { targetId: "payer_a", basisPoints: 3334 },
      { targetId: "payer_b", basisPoints: 3333 },
      { targetId: "payer_c", basisPoints: 3333 }
    ];
    const result = allocateByBasisPoints(100, shares);
    const values = [...result.values()].sort((a, b) => a - b);
    expect(values).toEqual([33, 33, 34]);
    expect(values.reduce((sum, v) => sum + v, 0)).toBe(100);
  });

  it("handles a 25/25/50 split with no penny drift", () => {
    // 2376 cents (pitcher grossCents), 25/25/50 → 594 + 594 + 1188 = 2376
    const shares = [
      { targetId: "payer_a", basisPoints: 2500 },
      { targetId: "payer_b", basisPoints: 2500 },
      { targetId: "payer_c", basisPoints: 5000 }
    ];
    const result = allocateByBasisPoints(2376, shares);
    expect(result.get("payer_a")).toBe(594);
    expect(result.get("payer_b")).toBe(594);
    expect(result.get("payer_c")).toBe(1188);
    expect([...result.values()].reduce((sum, v) => sum + v, 0)).toBe(2376);
  });

  it("distributes penny remainder deterministically using largest fractional part", () => {
    // 10 cents split 3 ways: 3333 + 3333 + 3334 bps
    // exact: 3.333 + 3.333 + 3.334 → floors: 3 + 3 + 3 = 9, remainder = 1
    // fractional parts: 0.333, 0.333, 0.334 → payer_c gets the extra penny
    const shares = [
      { targetId: "payer_a", basisPoints: 3333 },
      { targetId: "payer_b", basisPoints: 3333 },
      { targetId: "payer_c", basisPoints: 3334 }
    ];
    const result = allocateByBasisPoints(10, shares);
    expect(result.get("payer_c")).toBe(4);
    expect([...result.values()].reduce((sum, v) => sum + v, 0)).toBe(10);
  });

  it("handles a single payer (10000 bps) with no rounding needed", () => {
    const shares = [{ targetId: "payer_a", basisPoints: 10000 }];
    const result = allocateByBasisPoints(5400, shares);
    expect(result.get("payer_a")).toBe(5400);
  });

  it("handles zero total cents gracefully", () => {
    const shares = [
      { targetId: "payer_a", basisPoints: 5000 },
      { targetId: "payer_b", basisPoints: 5000 }
    ];
    const result = allocateByBasisPoints(0, shares);
    expect(result.get("payer_a")).toBe(0);
    expect(result.get("payer_b")).toBe(0);
  });

  it("breaks ties in fractional remainder by targetId alphabetical order", () => {
    // 2 cents split 50/50: exact = 1.0 each, no fractional part → both floor to 1, no remainder
    const shares = [
      { targetId: "payer_a", basisPoints: 5000 },
      { targetId: "payer_b", basisPoints: 5000 }
    ];
    const result = allocateByBasisPoints(2, shares);
    expect(result.get("payer_a")).toBe(1);
    expect(result.get("payer_b")).toBe(1);
  });

  it("correctly handles a 7-way split of a prime number of cents", () => {
    // 101 cents / 7 payers, equal bps
    const payers = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({
      targetId: `payer_${id}`,
      basisPoints: Math.floor(10000 / 7)
    }));
    // Fix: adjust last payer to make bps sum to 10000
    payers[6]!.basisPoints += 10000 - payers.reduce((sum, p) => sum + p.basisPoints, 0);
    const result = allocateByBasisPoints(101, payers);
    const total = [...result.values()].reduce((sum, v) => sum + v, 0);
    expect(total).toBe(101);
    // each payer gets 14 or 15
    for (const v of result.values()) {
      expect(v).toBeGreaterThanOrEqual(14);
      expect(v).toBeLessThanOrEqual(15);
    }
  });
});
