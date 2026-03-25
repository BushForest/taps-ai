"use client";

import Link from "next/link";
import { use, useEffect, useState, useTransition } from "react";
import type { Route } from "next";
import type { CheckLineItem } from "@taps/contracts";
import { AdminShell } from "../../../../../../components/admin-shell";
import { fetchSessionDetail, applySessionCredit } from "../../../../../../lib/api-client";
import { formatCurrency } from "../../../../../../lib/format";

const REASONS = ["Sent Back", "Wrong Item", "Comp", "Complaint", "Price Fix", "Split Fix"] as const;
type Reason = typeof REASONS[number];

export default function AdjustBillPage(props: {
  params: Promise<{ restaurantId: string; sessionId: string }>;
}) {
  const { restaurantId, sessionId } = use(props.params);
  const [lines, setLines] = useState<CheckLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason>("Sent Back");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchSessionDetail(restaurantId, sessionId)
      .then((detail) => {
        const topLevel = detail.check?.lines?.filter((l) => !l.parentLineId) ?? [];
        setLines(topLevel);
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [restaurantId, sessionId]);

  const tableNum = sessionId.replace(/.*_/, "").toUpperCase();

  function toggleItem(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedLines = lines.filter((l) => selected.includes(l.id));
  const creditCents = selectedLines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const totalBeforeCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const newTotalCents = totalBeforeCents - creditCents;

  function handleSubmit() {
    if (selected.length === 0) return;
    startTransition(async () => {
      try {
        const label = notes.trim() ? `${reason}: ${notes.trim()}` : reason;
        await applySessionCredit(sessionId, { amountCents: creditCents, label });
        setSubmitted(true);
      } catch {
        setError("Failed to submit adjustment");
      }
    });
  }

  return (
    <AdminShell restaurantId={restaurantId} activeTab="floor">
      <div className="admin-sub-header">
        <Link href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route} className="admin-back-btn" aria-label="Back">←</Link>
        <span className="admin-sub-header__title">Adjust Bill</span>
        <span className="admin-app-badge">Admin</span>
      </div>

      <div className="admin-sub-body">
        {submitted ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ color: "#5fad7e", fontWeight: 600, marginBottom: 8 }}>Adjustment Applied</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
              Credit of {formatCurrency(creditCents)} applied to this table.
            </div>
            <Link
              href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route}
              className="adj-submit-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              Back to Table
            </Link>
          </div>
        ) : (
          <>
            <p className="adj-context">TABLE {tableNum}</p>

            <p className="admin-section-label">Reason for Adjustment</p>
            <div className="adj-reasons">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`adj-reason-btn${reason === r ? " adj-reason-btn--active" : ""}`}
                  onClick={() => setReason(r)}
                  disabled={isPending}
                >
                  {r}
                </button>
              ))}
            </div>

            <p className="admin-section-label">Select Items to Adjust</p>
            <div className="adj-items">
              {loading ? (
                <div className="edit-order-empty">Loading items…</div>
              ) : error ? (
                <div className="edit-order-empty" style={{ color: "#ef4444" }}>{error}</div>
              ) : lines.length === 0 ? (
                <div className="edit-order-empty">No items on this order.</div>
              ) : (
                lines.map((line) => (
                  <label key={line.id} className="adj-item-row">
                    <input
                      type="checkbox"
                      className="adj-checkbox"
                      checked={selected.includes(line.id)}
                      onChange={() => toggleItem(line.id)}
                      disabled={isPending || line.status === "voided"}
                    />
                    <span className="adj-item-name">
                      {line.name}{line.quantity > 1 ? ` x${line.quantity}` : ""}
                    </span>
                    <span className="adj-item-price">{formatCurrency(line.unitPriceCents * line.quantity)}</span>
                  </label>
                ))
              )}
            </div>

            <p className="admin-section-label">Notes</p>
            <textarea
              className="admin-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the reason for adjustment..."
              disabled={isPending}
            />

            <p className="admin-section-label">Adjustment Summary</p>
            <div className="adj-summary">
              <div className="adj-summary-row">
                <span>Items Selected</span>
                <span>{selected.length} items</span>
              </div>
              <div className="adj-summary-row adj-summary-row--credit">
                <span>Credit Amount</span>
                <span>-{formatCurrency(creditCents)}</span>
              </div>
              <div className="adj-summary-row adj-summary-row--total">
                <span>New Total</span>
                <span>{formatCurrency(newTotalCents)}</span>
              </div>
            </div>

            <button
              type="button"
              className="adj-submit-btn"
              style={{ width: "100%", marginTop: 8 }}
              onClick={handleSubmit}
              disabled={isPending || selected.length === 0 || loading}
            >
              {isPending ? "Applying…" : "Apply Adjustment"}
            </button>
            <Link
              href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route}
              className="adj-cancel-btn"
              style={{ display: "block", textAlign: "center", marginTop: 12 }}
            >
              Cancel
            </Link>
          </>
        )}
      </div>
    </AdminShell>
  );
}
