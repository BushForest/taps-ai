import { redirect } from "next/navigation";
import { SectionCard } from "../../../components/section-card";
import { SessionShell } from "../../../components/session-shell";
import { resolveTap } from "../../../lib/api-client";

export default async function TapPage(props: { params: Promise<{ tagCode: string }> }) {
  const { tagCode } = await props.params;

  let publicToken: string;
  try {
    const response = await resolveTap(tagCode);
    publicToken = response.access.session.publicToken;
  } catch (error) {
    return (
      <SessionShell title="We couldn't open this table" subtitle="The tap did not resolve cleanly, so we could not show the bill.">
        <SectionCard tone="warn" eyebrow="Tap Failed" title="Try the table again">
          <p className="stat-detail" style={{ margin: 0 }}>
            {error instanceof Error ? error.message : "Unknown tap resolution failure."}
          </p>
        </SectionCard>
      </SessionShell>
    );
  }
  redirect(`/session/${publicToken}/check`);
}
