import Link from "next/link";
import { cookies } from "next/headers";
import { AdminShell } from "../../../../components/admin-shell";
import { OpsCard } from "../../../../components/ops-card";
import { StatusPill } from "../../../../components/status-pill";
import { fetchRestaurantTables } from "../../../../lib/api-client";
import { formatCurrency } from "../../../../lib/format";
import { getRoleFromCookie } from "../../../../lib/auth";

export default async function TablesPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const response = await fetchRestaurantTables(restaurantId);

  return (
    <AdminShell
      restaurantId={restaurantId}
      title="All Tables"
      subtitle={`Room view for ${restaurantId}. Use this to see every table before drilling into a single live session.`}
      role={role ?? undefined}
    >
      <OpsCard title="Tables in the room">
        <div className="admin-table-grid">
          {response.tables.map((table) => (
            <article key={table.tableId} className="admin-table-card">
              <div className="admin-row-top">
                <div>
                  <h3 className="admin-row-title">{table.tableLabel}</h3>
                  <p className="admin-row-meta">{table.tableId}</p>
                </div>
                <StatusPill value={table.sessionStatus} />
              </div>
              <div className="admin-inline-metrics">
                <InlineMetric label="Remaining" value={formatCurrency(table.remainingBalanceCents)} />
                <InlineMetric label="Payers" value={`${table.payerCompletionCount}/${table.totalPayerCount}`} />
                <InlineMetric label="Public" value={table.publicAccessAllowed ? "Open" : "Locked"} />
              </div>
              <div className="admin-action-stack">
                {table.sessionId ? (
                  <Link href={`/restaurants/${restaurantId}/sessions/${table.sessionId}`} className="admin-nav__link">
                    Inspect live session
                  </Link>
                ) : (
                  <p className="admin-note">No active session recorded for this table yet.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </OpsCard>
    </AdminShell>
  );
}

function InlineMetric(props: { label: string; value: string }) {
  return (
    <article className="admin-inline-metric">
      <p className="admin-inline-metric__label">{props.label}</p>
      <p className="admin-inline-metric__value">{props.value}</p>
    </article>
  );
}
