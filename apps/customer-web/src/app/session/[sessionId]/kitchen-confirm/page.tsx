"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { SessionShell } from "../../../../components/session-shell";
import { useCart } from "../../../../hooks/use-cart";
import { getItemImage, getAllergens } from "../../../../components/menu-browser";
import { apiPost, fetchGuestSummary } from "../../../../lib/api-client";
import { displayTableLabel } from "../../../../lib/format";

export default function KitchenConfirmPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableLabel, setTableLabel] = useState<string | undefined>();

  useEffect(() => {
    fetchGuestSummary(publicToken)
      .then((s) => setTableLabel(displayTableLabel(s.session?.tableId ?? s.access.session.tableId)))
      .catch(() => undefined);
  }, [publicToken]);

  async function handleSend() {
    if (items.length === 0) return;
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
      clearCart();
      router.push(`/session/${publicToken}/check` as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send order. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <SessionShell publicToken={publicToken} activeNav="menu" tableLabel={tableLabel}>
      <div className="kitchen-confirm-page">
        <div className="kitchen-confirm-nav">
          <button
            type="button"
            className="kitchen-confirm-back"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            ←
          </button>
          <p className="kitchen-confirm-title">Review Order</p>
        </div>

        <div className="kitchen-confirm-list">
          {items.length === 0 ? (
            <p className="kitchen-confirm-empty">Your cart is empty.</p>
          ) : (
            items.map((item, i) => {
              const imgUrl = getItemImage(item.name);
              const allergens = getAllergens(item.name);
              const modifier = [item.options.doneness, item.options.sauce]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={`${item.id}-${i}`} className="kitchen-confirm-item">
                  <div className="kitchen-confirm-item__thumb">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.name}
                        fill
                        sizes="64px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>🍽️</span>
                    )}
                  </div>
                  <div className="kitchen-confirm-item__left">
                    <span className="kitchen-confirm-item__name">
                      {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                    </span>
                    {modifier ? (
                      <span className="kitchen-confirm-item__modifier">{modifier}</span>
                    ) : null}
                    {item.options.notes ? (
                      <span className="kitchen-confirm-item__notes">{item.options.notes}</span>
                    ) : null}
                    {allergens.length > 0 ? (
                      <div className="kitchen-confirm-item__badges">
                        {allergens.map((a) => (
                          <span key={a.code} className={`menu-chip menu-chip--${a.code}`}>{a.label}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error ? (
          <p className="kitchen-confirm-error">{error}</p>
        ) : null}

        <div className="kitchen-confirm-footer">
          <button
            type="button"
            className="bb-btn-gold"
            onClick={handleSend}
            disabled={submitting || items.length === 0}
          >
            {submitting ? "Sending…" : "Send to Kitchen"}
          </button>
          <Link
            href={`/session/${publicToken}/menu` as Route}
            className="btn-ghost"
            style={{ textAlign: "center", display: "block" }}
          >
            Keep Browsing
          </Link>
        </div>
      </div>
    </SessionShell>
  );
}
