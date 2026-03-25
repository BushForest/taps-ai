import type { CurrencyCode, Money } from "@taps/contracts";

export function money(amountCents: number, currency: CurrencyCode = "USD"): Money {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`Money must use integer cents, received ${amountCents}`);
  }

  return { amountCents, currency };
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountCents + right.amountCents, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountCents - right.amountCents, left.currency);
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} vs ${right.currency}`);
  }
}
