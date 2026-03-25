import Link from "next/link";
import type { PaymentAttemptStatus } from "@taps/contracts";
import { AccessStatePanel } from "../../../../components/access-state-panel";
import { SectionCard } from "../../../../components/section-card";
import { SessionShell } from "../../../../components/session-shell";
import { StatusPill } from "../../../../components/status-pill";
import { fetchGuestStatus } from "../../../../lib/api-client";
import { formatCurrency } from "../../../../lib/format";

const SUCCESS_STATUSES = new Set<PaymentAttemptStatus>(["captured", "provider_succeeded_pending_pos", "reconciled"]);
const PENDING_STATUSES = new Set<PaymentAttemptStatus>([
  "draft",
  "intent_created",
  "authorization_pending",
  "authorized",
  "capture_pending"
]);

export default async function SessionPaymentResultPage(props: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId: publicToken } = await props.params;
  const searchParams = await props.searchParams;
  const summary = await fetchGuestStatus(publicToken);

  const payerId = typeof searchParams.payerId === "string" ? searchParams.payerId : undefined;
  const paymentAttemptId =
    typeof searchParams.paymentAttemptId === "string" ? searchParams.paymentAttemptId : undefined;
  const paymentStatus = parsePaymentStatus(searchParams.paymentStatus);
  const amountCents = parseNumber(searchParams.amountCents);
  const tipCents = parseNumber(searchParams.tipCents);
  const totalPaidCents = amountCents + tipCents;
  const payer = payerId ? summary.payers?.find((candidate) => candidate.id === payerId) : undefined;
  const settlement = summary.settlement;
  const payerComplete = payer?.status === "completed" || SUCCESS_STATUSES.has(paymentStatus);
  const tableComplete = Boolean(settlement?.tableComplete);
  const resultTone = SUCCESS_STATUSES.has(paymentStatus) ? "success" : PENDING_STATUSES.has(paymentStatus) ? "pending" : "warn";

  return (
    <SessionShell
      publicToken={publicToken}
      activeNav="status"
      title="Payment result"
      subtitle="First confirm your payment, then check whether the table is finished or still open for everyone else."
    >
      {!summary.access.publicAccessAllowed ? (
        <AccessStatePanel summary={summary} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard
            tone={resultTone === "warn" ? "warn" : resultTone === "success" ? "success" : "default"}
            eyebrow="Payment Result"
            title={resultHeadline(paymentStatus, tableComplete)}
          >
            <div className="result-head">
              <div
                className={
                  resultTone === "success" ? "result-badge result-badge--success" : "result-badge result-badge--pending"
                }
              >
                {resultTone === "success" ? "OK" : resultTone === "pending" ? "..." : "!"}
              </div>
              <div className="result-copy">
                <StatusPill value={paymentStatus} />
                <p className={resultTone === "success" ? "stat-detail success-text" : "stat-detail"} style={{ margin: 0 }}>
                  {resultMessage(paymentStatus, tableComplete, settlement?.remainingBalanceCents ?? 0)}
                </p>
                {paymentAttemptId ? (
                  <p className="stat-detail" style={{ margin: 0 }}>
                    Confirmation reference: {paymentAttemptId}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="stat-grid">
              <article className="stat-card">
                <p className="stat-kicker">You paid</p>
                <p className="stat-value">{formatCurrency(totalPaidCents)}</p>
                <p className="stat-detail">
                  {tipCents > 0 ? `${formatCurrency(amountCents)} share + ${formatCurrency(tipCents)} tip.` : "Your payment did not include a tip."}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">Table still owes</p>
                <p className="stat-value">
                  {tableComplete ? "Settled" : formatCurrency(settlement?.remainingBalanceCents ?? 0)}
                </p>
                <p className="stat-detail">
                  {tableComplete ? "No table balance remains." : "Other guests may still need to pay their share."}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">You</p>
                <p className="stat-value" style={{ fontSize: "1.2rem" }}>
                  {payerComplete ? "Done" : "Pending"}
                </p>
                <p className="stat-detail">
                  {payer?.displayName ? `${payer.displayName} is ${payerComplete ? "complete" : "still pending"}.` : "This tells you whether your own share is complete."}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-kicker">Table</p>
                <p className="stat-value" style={{ fontSize: "1.2rem" }}>
                  {tableComplete ? "Done" : "Open"}
                </p>
                <p className="stat-detail">
                  {tableComplete
                    ? "Everyone is settled and the table can close."
                    : `${settlement?.payerCompletionCount ?? 0} of ${settlement?.totalPayerCount ?? 0} payer records are complete.`}
                </p>
              </article>
            </div>
          </SectionCard>

          {!tableComplete && summary.closeValidation && !summary.closeValidation.canClose ? (
            <SectionCard tone="warn" eyebrow="Still Open" title="Why the table is not done yet">
              <ul className="support-list">
                {summary.closeValidation.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <div className="cta-stack">
            <Link
              href={payerId ? `/session/${publicToken}/status?payerId=${encodeURIComponent(payerId)}` : `/session/${publicToken}/status`}
              className="cta-primary"
            >
              See table status
            </Link>
            <Link
              href={payerId ? `/session/${publicToken}/loyalty?payerId=${encodeURIComponent(payerId)}` : `/session/${publicToken}/loyalty`}
              className="cta-secondary"
            >
              Add loyalty phone
            </Link>
            {!tableComplete ? (
              <Link href={`/session/${publicToken}/split`} className="cta-ghost">
                Keep paying this table
              </Link>
            ) : (
              <Link href={`/session/${publicToken}/check`} className="cta-ghost">
                Review final bill
              </Link>
            )}
          </div>
        </div>
      )}
    </SessionShell>
  );
}

function parseNumber(value: string | string[] | undefined) {
  const raw = typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function parsePaymentStatus(value: string | string[] | undefined): PaymentAttemptStatus {
  return typeof value === "string" ? (value as PaymentAttemptStatus) : "captured";
}

function resultHeadline(status: PaymentAttemptStatus, tableComplete: boolean) {
  if (SUCCESS_STATUSES.has(status)) {
    return tableComplete ? "You paid. The table is done." : "You paid.";
  }

  if (PENDING_STATUSES.has(status)) {
    return "Payment is still processing";
  }

  return "Payment needs attention";
}

function resultMessage(status: PaymentAttemptStatus, tableComplete: boolean, remainingBalanceCents: number) {
  if (SUCCESS_STATUSES.has(status)) {
    return tableComplete
      ? "Your payment finished cleanly and the table is fully settled."
      : `Your payment finished cleanly. The table still owes ${formatCurrency(remainingBalanceCents)}.`;
  }

  if (PENDING_STATUSES.has(status)) {
    return "Your payment is still being confirmed. Stay on the table status page if you want the latest update.";
  }

  return "This payment did not finish cleanly. Check the bill status before trying again.";
}
