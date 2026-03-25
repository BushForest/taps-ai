"use client";

import Link from "next/link";
import { use, useEffect, useState, useTransition } from "react";
import type { Route } from "next";
import type { CheckLineItem } from "@taps/contracts";
import type { MenuSnapshot } from "@taps/contracts";
import { AdminShell } from "../../../../../../components/admin-shell";
import {
  fetchSessionDetail,
  fetchRestaurantMenu,
  voidSessionLine,
  addSessionItem,
} from "../../../../../../lib/api-client";
import { formatCurrency } from "../../../../../../lib/format";

export default function EditOrderPage(props: {
  params: Promise<{ restaurantId: string; sessionId: string }>;
}) {
  const { restaurantId, sessionId } = use(props.params);
  const [lines, setLines] = useState<CheckLineItem[]>([]);
  const [menu, setMenu] = useState<MenuSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      fetchSessionDetail(restaurantId, sessionId),
      fetchRestaurantMenu(restaurantId),
    ])
      .then(([detail, menuData]) => {
        setLines(detail.check?.lines?.filter((l) => !l.parentLineId) ?? []);
        setMenu(menuData);
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [restaurantId, sessionId]);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;

  function handleVoidLine(lineId: string) {
    startTransition(async () => {
      try {
        await voidSessionLine(sessionId, lineId);
        setLines((prev) => prev.filter((l) => l.id !== lineId));
      } catch {
        // line stays if void fails
      }
    });
  }

  function handleAddItem(menuItemId: string) {
    startTransition(async () => {
      try {
        const result = await addSessionItem(sessionId, { menuItemId, quantity: 1 });
        const newLines = result.detail.check?.lines?.filter((l) => !l.parentLineId) ?? [];
        setLines(newLines);
        setSearch("");
      } catch {
        // ignore on failure
      }
    });
  }

  const menuResults = search.trim().length > 0 && menu
    ? menu.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) &&
        item.availability === "available"
      ).slice(0, 5)
    : [];

  return (
    <AdminShell restaurantId={restaurantId} activeTab="floor">
      <div className="edit-order-nav">
        <Link href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route} className="edit-order-back">←</Link>
        <span className="edit-order-title">Edit Order</span>
        <span className="admin-app-badge">Admin</span>
      </div>

      {/* Search to add items */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="edit-order-search"
          placeholder="Search menu to add items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={isPending}
        />
        {menuResults.length > 0 && (
          <div className="edit-order-menu-results">
            {menuResults.map((item) => (
              <button
                key={item.id}
                type="button"
                className="edit-order-menu-result"
                onClick={() => handleAddItem(item.id)}
                disabled={isPending}
              >
                <span className="edit-order-menu-result__name">{item.name}</span>
                <span className="edit-order-menu-result__price">{formatCurrency(item.basePriceCents)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="edit-order-section-label">Current Items</div>

      {loading ? (
        <div className="edit-order-empty">Loading order…</div>
      ) : error ? (
        <div className="edit-order-empty" style={{ color: "#ef4444" }}>{error}</div>
      ) : lines.length === 0 ? (
        <div className="edit-order-empty">No items on this order yet.</div>
      ) : (
        lines.map((line) => (
          <div key={line.id} className="edit-order-item">
            <div className="edit-order-item__top">
              <div className="edit-order-item__info">
                <div className="edit-order-item__name">{line.name}</div>
                <div className="edit-order-item__price">{formatCurrency(line.unitPriceCents)}</div>
              </div>
              <button
                type="button"
                className="edit-order-item__delete"
                onClick={() => handleVoidLine(line.id)}
                disabled={isPending || line.status === "voided"}
                aria-label="Remove"
              >
                🗑
              </button>
            </div>
            <div className="edit-order-item__bottom">
              <span className="edit-order-item__qty">
                qty: {line.quantity}
              </span>
              {line.status !== "open" && (
                <span className="edit-order-item__modifier" style={{ color: "#ef4444" }}>
                  {line.status}
                </span>
              )}
            </div>
          </div>
        ))
      )}

      <div className="edit-order-totals" style={{ marginTop: 20 }}>
        <div className="edit-order-total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="edit-order-total-row">
          <span>Tax (13%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="edit-order-total-row edit-order-total-row--grand">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="edit-order-footer">
        <Link href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route} className="edit-order-btn edit-order-btn--cancel">
          Done
        </Link>
      </div>
    </AdminShell>
  );
}
