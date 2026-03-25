import { AccessStatePanel } from "../../../../components/access-state-panel";
import { LoyaltyForm } from "../../../../components/loyalty-form";
import { SectionCard } from "../../../../components/section-card";
import { SessionShell } from "../../../../components/session-shell";
import { fetchGuestSummary } from "../../../../lib/api-client";

export default async function SessionLoyaltyPage(props: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId: publicToken } = await props.params;
  const searchParams = await props.searchParams;
  const defaultPayerId = typeof searchParams.payerId === "string" ? searchParams.payerId : undefined;
  const summary = await fetchGuestSummary(publicToken);

  return (
    <SessionShell
      publicToken={publicToken}
      activeNav="status"
      title="Add your phone"
      subtitle="Save this visit to loyalty in one quick step after payment, without reopening the table."
    >
      {!summary.access.publicAccessAllowed ? (
        <AccessStatePanel summary={summary} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SectionCard eyebrow="Optional" title="Save this visit to loyalty">
            <p className="stat-detail" style={{ margin: 0 }}>
              Attach a phone number after payment so points can post without slowing down the table.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Loyalty" title="Attach by phone">
            <LoyaltyForm publicToken={publicToken} initialSummary={summary} defaultPayerId={defaultPayerId} />
          </SectionCard>
        </div>
      )}
    </SessionShell>
  );
}
