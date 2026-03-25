import Link from "next/link";
import type { Route } from "next";
import { AdminShell } from "../../../../../components/admin-shell";

const CUSTOMERS = [
  { name: "James Whitmore", visits: 12, spend: "$2,847", last: "Mar 20", badge: "Gold" },
  { name: "Priya Nair",     visits: 8,  spend: "$1,640", last: "Mar 18", badge: "Silver" },
  { name: "Daniel Croft",   visits: 6,  spend: "$1,182", last: "Mar 14", badge: "Silver" },
  { name: "Sophie Laurent", visits: 5,  spend: "$987",   last: "Mar 12", badge: null },
  { name: "Marcus Osei",    visits: 4,  spend: "$812",   last: "Mar 9",  badge: null },
];

export default async function RepeatCustomersPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics">
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Repeat Customers</h1>
          <div className="analytics-period-bar" style={{ paddingTop: 0, marginTop: 8 }}>
            {["Date", "Weekly", "Monthly", "YTD"].map((p) => (
              <button key={p} type="button" className={`analytics-period-btn${p === "Monthly" ? " analytics-period-btn--active" : ""}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="analytics-kpi-grid" style={{ margin: "8px 16px 16px" }}>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">34%</p>
            <p className="analytics-kpi__label">Return Rate</p>
          </div>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">127</p>
            <p className="analytics-kpi__label">Regulars</p>
          </div>
          <div className="analytics-kpi analytics-kpi--wide">
            <p className="analytics-kpi__value">2.8×</p>
            <p className="analytics-kpi__label">Higher Spend</p>
            <p className="analytics-kpi__sub">vs first-timers</p>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px" }}>Top Regulars</p>
        <div className="analytics-list">
          {CUSTOMERS.map((c) => (
            <div key={c.name} className="analytics-customer-row">
              <div className="analytics-customer-avatar">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="analytics-customer-name">{c.name}</span>
                  {c.badge && <span className={`analytics-customer-badge analytics-customer-badge--${c.badge.toLowerCase()}`}>{c.badge}</span>}
                </div>
                <span className="analytics-customer-meta">{c.visits} visits · Last: {c.last}</span>
              </div>
              <span className="analytics-customer-spend">{c.spend}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
