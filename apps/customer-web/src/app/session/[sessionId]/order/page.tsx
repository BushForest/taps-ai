import Link from "next/link";
import { SessionShell } from "../../../../components/session-shell";
import { fetchGuestSummary, fetchCheck } from "../../../../lib/api-client";
import { displayTableLabel, formatCurrency, rootPayableLines } from "../../../../lib/format";

export default async function SessionOrderPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = await props.params;
  const summary = await fetchGuestSummary(publicToken);
  const checkResponse = summary.access.publicAccessAllowed ? await fetchCheck(publicToken) : null;
  const snapshot = checkResponse?.snapshot;
  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access.session.tableId);
  const payers = summary.payers ?? [];

  return (
    <SessionShell
      publicToken={publicToken}
      activeNav="bill"
      title={`${tableLabel} — Tonight's Order`}
      subtitle="All items ordered at this table, grouped by who's paying."
    >
      <div style={{ display: "grid", gap: 20 }}>
        {snapshot ? (
          <>
            {/* Per-payer sections */}
            {payers.length > 0 ? (
              payers.map((payer) => {
                const payerLines = rootPayableLines(snapshot.lines).filter(
                  (line) => line.assignedCents > 0
                );
                return (
                  <div key={payer.id} className="bb-order-payer-section">
                    <div className="bb-order-payer-header">
                      <div className="bb-order-payer-avatar">
                        {payer.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="bb-order-payer-name">{payer.displayName}</span>
                      <span
                        className={`bb-order-payer-status bb-order-payer-status--${payer.status}`}
                      >
                        {payer.status === "completed" ? "Paid" : payer.status === "left" ? "Left" : "Ordering"}
                      </span>
                    </div>
                    {payerLines.length === 0 ? (
                      <p className="bb-order-empty">No items assigned yet.</p>
                    ) : (
                      <div className="bb-order-line-list">
                        {payerLines.map((line) => (
                          <div key={line.id} className="bb-order-line">
                            <span className="bb-order-line__name">{line.name}</span>
                            <span className="bb-order-line__price">{formatCurrency(line.grossCents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : null}

            {/* All items on the table */}
            <div className="bb-order-payer-section">
              <div className="bb-order-payer-header">
                <div className="bb-order-payer-avatar" style={{ background: "var(--color-gold)" }}>
                  🍽
                </div>
                <span className="bb-order-payer-name">All Items on Table</span>
                <span className="bb-order-total-badge">
                  {formatCurrency(snapshot.totalCents)}
                </span>
              </div>
              <div className="bb-order-line-list">
                {rootPayableLines(snapshot.lines).map((line) => (
                  <div key={line.id} className="bb-order-line">
                    <span className="bb-order-line__name">{line.name}</span>
                    <span className="bb-order-line__price">{formatCurrency(line.grossCents)}</span>
                  </div>
                ))}
              </div>
              <div className="bb-order-subtotals">
                <div className="bb-order-subtotal-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(snapshot.subtotalCents)}</span>
                </div>
                {snapshot.taxCents > 0 ? (
                  <div className="bb-order-subtotal-row">
                    <span>Tax</span>
                    <span>{formatCurrency(snapshot.taxCents)}</span>
                  </div>
                ) : null}
                {snapshot.feeCents > 0 ? (
                  <div className="bb-order-subtotal-row">
                    <span>Fees</span>
                    <span>{formatCurrency(snapshot.feeCents)}</span>
                  </div>
                ) : null}
                <div className="bb-order-subtotal-row bb-order-subtotal-row--total">
                  <span>Total</span>
                  <span>{formatCurrency(snapshot.totalCents)}</span>
                </div>
                {snapshot.amountPaidCents > 0 ? (
                  <div className="bb-order-subtotal-row" style={{ color: "var(--color-gold-deep)" }}>
                    <span>Already Paid</span>
                    <span>−{formatCurrency(snapshot.amountPaidCents)}</span>
                  </div>
                ) : null}
                <div className="bb-order-subtotal-row bb-order-subtotal-row--remaining">
                  <span>Remaining</span>
                  <span>{formatCurrency(snapshot.remainingBalanceCents)}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/session/${publicToken}/split`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "18px 28px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: "0.02em",
                textDecoration: "none",
                boxShadow: "0 4px 18px rgba(160,120,64,0.35)",
                marginTop: 8,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>💳</span>
              Pay Your Share
            </Link>
            <p style={{ margin: 0, textAlign: "center", fontSize: "0.8rem", color: "var(--color-muted, #888)" }}>
              Split evenly, by item, or enter a custom amount
            </p>
          </>
        ) : (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-muted, #888)" }}>
            <p>No order data available yet. Items will appear once the table has been opened.</p>
            <Link
              href={`/session/${publicToken}/check`}
              style={{ color: "var(--color-gold)", fontWeight: 700, textDecoration: "none" }}
            >
              View Bill &rarr;
            </Link>
          </div>
        )}
      </div>
    </SessionShell>
  );
}
