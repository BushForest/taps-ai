import { AccessStatePanel } from "../../../../components/access-state-panel";
import { MenuBrowser } from "../../../../components/menu-browser";
import { SessionShell } from "../../../../components/session-shell";
import { fetchGuestSummary, fetchMenu } from "../../../../lib/api-client";
import { displayTableLabel } from "../../../../lib/format";

export default async function SessionMenuPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = await props.params;
  const summary = await fetchGuestSummary(publicToken);
  const menu = summary.access.publicAccessAllowed ? await fetchMenu(publicToken) : null;
  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access.session.tableId);

  return (
    <SessionShell publicToken={publicToken} activeNav="menu" tableLabel={tableLabel}>
      {!summary.access.publicAccessAllowed ? (
        <AccessStatePanel summary={summary} />
      ) : menu ? (
        <MenuBrowser menu={menu} publicToken={publicToken} />
      ) : (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
          <p>Menu unavailable right now. Please ask your server.</p>
        </div>
      )}
    </SessionShell>
  );
}
