import Link from "next/link";
import type { Route } from "next";
import { AdminShell } from "../../../../../components/admin-shell";

const STATIONS = [
  { name: "Grill",     avg: "14 min", peak: "22 min", orders: 42, color: "var(--gold)" },
  { name: "Sauté",     avg: "11 min", peak: "18 min", orders: 38, color: "var(--green)" },
  { name: "Cold",      avg: "6 min",  peak: "9 min",  orders: 29, color: "var(--green)" },
  { name: "Pastry",    avg: "8 min",  peak: "12 min", orders: 14, color: "var(--amber)" },
];

const TICKETS = [
  { table: "Table 6",  items: 5, time: "18 min", status: "delayed" },
  { table: "Table 11", items: 3, time: "12 min", status: "on_time" },
  { table: "Table 3",  items: 4, time: "8 min",  status: "on_time" },
  { table: "Table 8",  items: 2, time: "6 min",  status: "on_time" },
];

export default async function KitchenPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics">
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Kitchen & Ops</h1>
          <div className="analytics-period-bar" style={{ paddingTop: 0, marginTop: 8 }}>
            {["Live", "Today", "Weekly"].map((p) => (
              <button key={p} type="button" className={`analytics-period-btn${p === "Live" ? " analytics-period-btn--active" : ""}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="analytics-kpi-grid" style={{ margin: "8px 16px 16px" }}>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">12 min</p>
            <p className="analytics-kpi__label">Avg Ticket</p>
          </div>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">2</p>
            <p className="analytics-kpi__label">Delayed</p>
          </div>
          <div className="analytics-kpi analytics-kpi--wide">
            <p className="analytics-kpi__value">94%</p>
            <p className="analytics-kpi__label">On-Time Rate</p>
            <p className="analytics-kpi__sub">↑ 2% vs last week</p>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px" }}>Station Performance</p>
        <div className="analytics-list">
          {STATIONS.map((s) => (
            <div key={s.name} className="analytics-station-row">
              <div className="analytics-station-dot" style={{ background: s.color }} />
              <div style={{ flex: 1 }}>
                <p className="analytics-station-name">{s.name}</p>
                <p className="analytics-station-meta">{s.orders} orders</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="analytics-station-avg">{s.avg} avg</p>
                <p className="analytics-station-peak">{s.peak} peak</p>
              </div>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>Active Tickets</p>
        <div className="analytics-list">
          {TICKETS.map((t) => (
            <div key={t.table} className="analytics-ticket-row">
              <span className="analytics-ticket-table">{t.table}</span>
              <span className="analytics-ticket-items">{t.items} items</span>
              <span className={`analytics-ticket-time analytics-ticket-time--${t.status}`}>{t.time}</span>
              <span className={`analytics-issue-sev analytics-issue-sev--${t.status === "delayed" ? "high" : "low"}`}>
                {t.status === "delayed" ? "Delayed" : "On Time"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
