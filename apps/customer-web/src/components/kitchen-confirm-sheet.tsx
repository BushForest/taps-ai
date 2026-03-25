"use client";

import { useState } from "react";
import type { CartItem } from "../hooks/use-cart";
import { formatCurrency } from "../lib/format";
import { apiPost } from "../lib/api-client";

interface KitchenConfirmSheetProps {
  publicToken: string;
  items: CartItem[];
  onClose: () => void;
  onSent: () => void;
}

export function KitchenConfirmSheet({ publicToken, items, onClose, onSent }: KitchenConfirmSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((sum, i) => sum + i.basePriceCents * i.quantity, 0);

  async function handleSend() {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/public/sessions/${publicToken}/order`, {
        lines: items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          modifiers: [
            ...(item.options.doneness ? [{ type: "doneness", value: item.options.doneness }] : []),
            ...(item.options.sauce ? [{ type: "sauce", value: item.options.sauce }] : []),
          ],
          notes: item.options.notes ?? "",
        })),
      });
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send order. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <div className="sheet__header">
          <h2 className="sheet__title">Pending Order</h2>
          <button className="sheet__close" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <div className="sheet__body">
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                </span>
                {item.options.doneness && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.options.doneness}</span>
                )}
                {item.options.sauce && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.options.sauce}</span>
                )}
                {item.options.notes && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>{item.options.notes}</span>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: "var(--ink)" }}>
                {formatCurrency(item.basePriceCents * item.quantity)}
              </span>
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
            <span>Subtotal</span>
            <span style={{ color: "var(--gold-text)" }}>{formatCurrency(total)}</span>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--red)", textAlign: "center" }}>{error}</p>
          )}
        </div>

        <div className="sheet__footer">
          <button
            className="kitchen-bar__cta"
            style={{ width: "100%", borderRadius: "var(--radius-pill)" }}
            type="button"
            onClick={handleSend}
            disabled={submitting || items.length === 0}
          >
            {submitting ? (
              <span className="spinner" />
            ) : (
              <>{"\uD83D\uDD25"} Send to Kitchen</>
            )}
          </button>
          <button className="btn-ghost" type="button" onClick={onClose} style={{ textAlign: "center" }}>
            Keep Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
