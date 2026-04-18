import { cookies } from "next/headers";
import { AdminShell } from "../../../../components/admin-shell";
import { getRoleFromCookie } from "../../../../lib/auth";

const WEEKLY_REVENUE = [480, 620, 390, 710, 840, 920, 1150];
const TODAY_IDX = 6;

const TOP_ITEMS = [
  { name: "Bone-In Ribeye 18oz", revenue: "$2,847" },
  { name: "Prime NY Strip 12oz", revenue: "$1,920" },
  { name: "Grilled Salmon",      revenue: "$1,340" },
  { name: "Truffle Fries",       revenue: "$984" },
  { name: "Old Fashioned",       revenue: "$861" },
];

const TABLE_STATS = [
  { label: "Avg table spend", value: "$247.50" },
  { label: "Avg covers / table", value: "3.2" },
  { label: "Avg session length", value: "1h 24m" },
  { label: "Tables turned today", value: "9" },
];

const maxBar = Math.max(...WEEKLY_REVENUE);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function AnalyticsPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics" role={role ?? undefined}>
      <div className="analytics-header">
        <div className="analytics-title">Analytics</div>
        <div className="analytics-date">{today}</div>
      </div>

      {/* KPI grid */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi">
          <div className="analytics-kpi__label">Today&apos;s Revenue</div>
          <div className="analytics-kpi__value analytics-kpi__value--gold">$4,892</div>
          <div className="analytics-kpi__sub">+12% vs yesterday</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi__label">Active Tables</div>
          <div className="analytics-kpi__value">9</div>
          <div className="analytics-kpi__sub">of 12 total</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi__label">Covers Today</div>
          <div className="analytics-kpi__value">47</div>
          <div className="analytics-kpi__sub">+5 vs yesterday</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi__label">Avg Check</div>
          <div className="analytics-kpi__value">$3.2k</div>
          <div className="analytics-kpi__sub" style={{ color: "#d4882e" }}>-2% vs avg</div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="analytics-section-title">Weekly Revenue</div>
      <div className="analytics-card">
        <div className="analytics-bar-chart">
          {WEEKLY_REVENUE.map((v, i) => (
            <div
              key={i}
              className={`analytics-bar${i === TODAY_IDX ? " analytics-bar--today" : ""}`}
              style={{ height: `${Math.round((v / maxBar) * 100)}%` }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444444", marginTop: 6 }}>
          {DAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* Top items */}
      <div className="analytics-section-title">Top Items</div>
      <div className="analytics-card">
        {TOP_ITEMS.map((item, i) => (
          <div key={item.name} className="analytics-item-row">
            <span className="analytics-item-row__rank">{i + 1}</span>
            <span className="analytics-item-row__name">{item.name}</span>
            <span className="analytics-item-row__value">{item.revenue}</span>
          </div>
        ))}
      </div>

      {/* Table stats */}
      <div className="analytics-section-title">Table Performance</div>
      <div className="analytics-card">
        {TABLE_STATS.map((stat) => (
          <div key={stat.label} className="analytics-stat-pair">
            <span className="analytics-stat-pair__label">{stat.label}</span>
            <span className="analytics-stat-pair__value">{stat.value}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
