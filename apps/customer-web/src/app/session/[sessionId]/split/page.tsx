import { AccessStatePanel } from "../../../../components/access-state-panel";
import { SessionShell } from "../../../../components/session-shell";
import { PayTab } from "../../../../components/pay-tab";
import { fetchGuestSummary } from "../../../../lib/api-client";
import { displayTableLabel } from "../../../../lib/format";

export default async function SessionSplitPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = await props.params;
  const summary = await fetchGuestSummary(publicToken);
  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access.session.tableId);

  return (
    <SessionShell publicToken={publicToken} activeNav="split" tableLabel={tableLabel}>
      {!summary.access.publicAccessAllowed ? <AccessStatePanel summary={summary} /> : <PayTab publicToken={publicToken} initialSummary={summary} />}
    </SessionShell>
  );
}
