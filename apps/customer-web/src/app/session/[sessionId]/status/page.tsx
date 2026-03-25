import Link from "next/link";
import { AccessStatePanel } from "../../../../components/access-state-panel";
import { SectionCard } from "../../../../components/section-card";
import { SessionShell } from "../../../../components/session-shell";
import { StatusPill } from "../../../../components/status-pill";
import { fetchGuestStatus } from "../../../../lib/api-client";
import { displayTableLabel, formatCurrency, titleCaseStatus } from "../../../../lib/format";

export default async function SessionStatusPage(props: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId: publicToken } = await props.params;
  const searchParams = await props.searchParams;
  const summary = await fetchGuestStatus(publicToken);
  const payerId = typeof searchParams.payerId === "string" ? searchParams.payerId : undefined;
  const payer = payerId ? summary.payers?.find((candidate) => candidate.id === payerId) : undefined;
  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access.session.tableId);
  const settlement = summary.settlement;
  const updatedLabel = settlement?.lastUpdatedAt
    ? new Date(settlement.lastUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : undefined;

  return (
    <SessionShell
      publicToken={publicToken}
      activeNav="status"
      title={tableLabel}
      subtitle="Keep your own payment status separate from the table so you can tell what's finished and what's still hanging."
    >
      {!summary.access.publicAccessAllowed ? (
        <AccessStatePanel summary={summary} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard
            eyebrow="Table Status"
            title={
              settlement?.tableComplete
                ? "Table settled"
                : `Table still owes ${formatCurrency(settlement?.remainingBalanceCents ?? 0)}`
            }
          >
            <div className="inline-row">
              <StatusPill value={summary.session?.status ?? summary.access.session.status} />
              <span className="muted">{updatedLabel ? `Public session active | Updated ${updatedLabel}` : "Public session active"}</span>
            </div>
            <div className="stat-grid">
              <article className="stat-card">
                <p className="stat-kicker">Table balance</p>
                <p className="stat-value">{formatCurrency(settlement?.remainingBalanceCents ?? 0)}</p>
                <p className="stat-detail">
                  {settlement?.tableComplete ? "Nothing is left on the table." : "This is still outstanding across everyone at the table."}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">Payers done</p>
                <p className="stat-value">
                  {settlement?.payerCompletionCount ?? 0}/{settlement?.totalPayerCount ?? 0}
                </p>
                <p className="stat-detail">A person being done is separate from the full table being done.</p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">Assignment</p>
                <p className="stat-value" style={{ fontSize: "1.15rem" }}>
                  {titleCaseStatus(settlement?.assignmentCompleteness)}
                </p>
                <p className="stat-detail">Unassigned lines and tiny leftovers still count.</p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">Table close</p>
                <p className="stat-value" style={{ fontSize: "1.15rem" }}>
                  {settlement?.tableCloseable ? "Ready" : "Not Yet"}
                </p>
                <p className="stat-detail">
                  {settlement?.hasPendingPayments
                    ? "A payment is still in flight."
                    : settlement?.hasBlockingMismatch
                      ? "A sync mismatch still needs resolution."
                      : "The remaining balance and assignment state decide this."}
                </p>
              </article>
            </div>
          </SectionCard>

          {payer ? (
            <SectionCard eyebrow="You" title={payer.status === "completed" ? "You're done" : "Your share is still open"}>
              <div className="inline-row">
                <strong>{payer.displayName}</strong>
                <StatusPill value={payer.status} />
              </div>
              <div className="detail-list">
                <DetailRow label="Your status" value={payer.status === "completed" ? "Payment complete" : "Still needs payment"} />
                <DetailRow label="Table status" value={settlement?.tableComplete ? "Table settled" : "Table still open"} />
                <DetailRow label="Phone on file" value={payer.phoneE164 ?? "No loyalty phone attached"} />
              </div>
            </SectionCard>
          ) : null}

          {summary.closeValidation && !summary.closeValidation.canClose ? (
            <SectionCard tone="warn" eyebrow="Still Open" title="What is still blocking table completion">
              <ul className="support-list">
                {summary.closeValidation.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <div className="cta-stack">
            <Link href={`/session/${publicToken}/split`} className="cta-primary">
              Keep paying
            </Link>
            <Link href={`/session/${publicToken}/check`} className="cta-secondary">
              Review live bill
            </Link>
            <Link
              href={payerId ? `/session/${publicToken}/loyalty?payerId=${encodeURIComponent(payerId)}` : `/session/${publicToken}/loyalty`}
              className="cta-ghost"
            >
              Add loyalty phone
            </Link>
          </div>
        </div>
      )}
    </SessionShell>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{props.label}</span>
      <span className="detail-row__value">{props.value}</span>
    </div>
  );
}
