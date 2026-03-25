import Link from "next/link";
import { AccessStatePanel } from "../../../../components/access-state-panel";
import { SessionShell } from "../../../../components/session-shell";
import { StaleCheckBanner } from "../../../../components/stale-check-banner";
import { fetchCheck, fetchGuestSummary } from "../../../../lib/api-client";
import {
  displayTableLabel,
  formatCurrency,
  rootPayableLines,
} from "../../../../lib/format";

export default async function SessionCheckPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = await props.params;
  const summary = await fetchGuestSummary(publicToken);
  const checkResponse = summary.access.publicAccessAllowed ? await fetchCheck(publicToken) : null;
  const snapshot = checkResponse?.snapshot;
  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access.session.tableId);

  const allLines = rootPayableLines(snapshot?.lines ?? []);
  const inKitchenLines = allLines.filter((l) => l.status === "sent");
  const onTableLines = allLines.filter((l) => l.status !== "sent");

  return (
    <SessionShell publicToken={publicToken} activeNav="bill" tableLabel={tableLabel}>
      <div style={{ display: "grid", gap: 16 }}>
        {!summary.access.publicAccessAllowed ? <AccessStatePanel summary={summary} /> : null}

        {checkResponse?.changes ? (
          <StaleCheckBanner
            title="Bill updated"
            message={`The table changed from check version ${checkResponse.changes.previousVersion} to ${checkResponse.changes.nextVersion}. Review the latest balance before you pay.`}
          />
        ) : null}

        {snapshot ? (
          <>
            {/* Two-column stat bar */}
            <div className="bill-stat-bar">
              <div className="bill-stat">
                <p className="bill-stat__amount" style={{ color: "var(--gold)" }}>
                  {formatCurrency(snapshot.amountPaidCents)}
                </p>
                <p className="bill-stat__label">Paid</p>
              </div>
              <div className="bill-stat">
                <p className="bill-stat__amount" style={{ color: "var(--ink)" }}>
                  {formatCurrency(snapshot.remainingBalanceCents)}
                </p>
                <p className="bill-stat__label">Remaining</p>
              </div>
            </div>

            {/* IN KITCHEN */}
            {inKitchenLines.length > 0 ? (
              <div className="bill-group">
                <p className="bill-section-in-kitchen">In Kitchen</p>
                {inKitchenLines.map((line) => {
                  const mods = (line as { modifiers?: Array<{ value: string }> }).modifiers;
                  const modText = mods?.map((m) => m.value).join(" · ");
                  return (
                    <div key={line.id} className="bill-item">
                      <div className="bill-item__info">
                        <span className="bill-item__name">{line.name}</span>
                        {modText ? <span className="bill-item__modifier">{modText}</span> : null}
                      </div>
                      <span className="bill-item__price">{formatCurrency(line.grossCents)}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* ON TABLE */}
            {onTableLines.length > 0 ? (
              <div className="bill-group">
                <p className="bill-section-on-table">On Table</p>
                {onTableLines.map((line) => {
                  const mods = (line as { modifiers?: Array<{ value: string }> }).modifiers;
                  const modText = mods?.map((m) => m.value).join(" · ");
                  return (
                    <div key={line.id} className="bill-item">
                      <div className="bill-item__info">
                        <span className="bill-item__name">{line.name}</span>
                        {modText ? <span className="bill-item__modifier">{modText}</span> : null}
                      </div>
                      <span className="bill-item__price">{formatCurrency(line.grossCents)}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {allLines.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)" }}>
                <p style={{ margin: 0, fontSize: 14 }}>No items ordered yet.</p>
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
            <p>No order data available yet. Items will appear once the table has been opened.</p>
          </div>
        )}
      </div>

      {/* Help FAB → Request Server */}
      <Link
        href={`/session/${publicToken}/server`}
        className="fab-btn"
        aria-label="Request server"
      >
        ?
      </Link>
    </SessionShell>
  );
}
