import type { CheckLineItem } from "@taps/contracts";

export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
}

export function titleCaseStatus(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function rootPayableLines(lines: CheckLineItem[]): CheckLineItem[] {
  return lines.filter((line) => !line.parentLineId && !["voided", "cancelled", "transferred"].includes(line.status));
}

export function childLines(lines: CheckLineItem[], parentId: string): CheckLineItem[] {
  return lines.filter((line) => line.parentLineId === parentId);
}

export function lineWithChildrenGross(lines: CheckLineItem[], lineId: string): number {
  const root = lines.find((line) => line.id === lineId);
  if (!root) {
    return 0;
  }

  return root.grossCents + childLines(lines, lineId).reduce((sum, child) => sum + child.grossCents, 0);
}

export function displayTableLabel(tableId?: string): string {
  if (!tableId) {
    return "Your table";
  }

  return tableId.startsWith("table_") ? `Table ${tableId.slice("table_".length)}` : tableId;
}
