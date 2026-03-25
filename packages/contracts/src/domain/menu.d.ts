import type { AuditStamp, CurrencyCode, UUID, VersionedRecord } from "./common";
export interface MenuCategory {
    id: UUID;
    name: string;
    sortOrder: number;
}
export interface MenuModifierOption {
    id: UUID;
    name: string;
    priceDeltaCents: number;
    defaultSelected?: boolean;
    availability: "available" | "sold_out" | "hidden";
}
export interface MenuModifierGroup {
    id: UUID;
    name: string;
    minSelections: number;
    maxSelections: number;
    options: MenuModifierOption[];
}
export interface MenuItem {
    id: UUID;
    categoryId: UUID;
    name: string;
    description?: string;
    basePriceCents: number;
    currency: CurrencyCode;
    availability: "available" | "sold_out" | "hidden";
    modifiers: MenuModifierGroup[];
    addOns: MenuModifierGroup[];
}
export interface MenuSnapshot extends AuditStamp, VersionedRecord {
    id: UUID;
    restaurantId: UUID;
    sessionId?: UUID;
    source: "pos" | "mirror";
    sourceVersion: string;
    currency: CurrencyCode;
    categories: MenuCategory[];
    items: MenuItem[];
    fetchedAt: string;
    validUntil?: string;
}
//# sourceMappingURL=menu.d.ts.map