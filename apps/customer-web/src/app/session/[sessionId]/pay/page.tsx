import Link from "next/link";
import { AccessStatePanel } from "../../../../components/access-state-panel";
import { PaymentReview } from "../../../../components/payment-review";
import { SectionCard } from "../../../../components/section-card";
import { SessionShell } from "../../../../components/session-shell";
import { fetchGuestSummary } from "../../../../lib/api-client";

export default async function SessionPayPage(props: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId: publicToken } = await props.params;
  const searchParams = await props.searchParams;
  const summary = await fetchGuestSummary(publicToken);

  const payerId = typeof searchParams.payerId === "string" ? searchParams.payerId : "";
  const allocationPlanId = typeof searchParams.planId === "string" ? searchParams.planId : "";
  const amountCents = Number(typeof searchParams.amountCents === "string" ? searchParams.amountCents : 0);
  const checkVersion = Number(typeof searchParams.checkVersion === "string" ? searchParams.checkVersion : 0);
  const mode = typeof searchParams.mode === "string" ? searchParams.mode : "custom_amount";

  return (
    <SessionShell
      publicToken={publicToken}
      activeNav="split"
      title="Review your payment"
      subtitle="Take one last look before you pay. You can finish your share even while the rest of the table is still open."
    >
      {!summary.access.publicAccessAllowed ? (
        <AccessStatePanel summary={summary} />
      ) : payerId && allocationPlanId && amountCents > 0 && checkVersion > 0 ? (
        <PaymentReview
          publicToken={publicToken}
          payerId={payerId}
          allocationPlanId={allocationPlanId}
          amountCents={amountCents}
          checkVersion={checkVersion}
          mode={mode}
          initialSummary={summary}
        />
      ) : (
        <SectionCard tone="warn" eyebrow="Missing Split" title="Pick your share first">
          <p className="stat-detail warn-text" style={{ margin: 0 }}>
            We need a payer and amount before we can build this payment. Head back to split selection and choose what you are covering.
          </p>
          <Link href={`/session/${publicToken}/split`} className="cta-secondary">
            Back to split selection
          </Link>
        </SectionCard>
      )}
    </SessionShell>
  );
}
