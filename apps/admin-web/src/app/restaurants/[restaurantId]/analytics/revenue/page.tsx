import Link from "next/link";
import type { Route } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "../../../../../components/admin-shell";
import { getRoleFromCookie } from "../../../../../lib/auth";

const CHANNELS = [
  { name: "Dine-In",    pct: 72, amount: "$3,522" },
  { name: "Bar",        pct: 18, amount: "$881" },
  { name: "Private",    pct: 10, amount: "$489" },
];

const DAYPARTS = [
  { name: "Lunch",    amount: "$1,102", covers: 14, pct: 22 },
  { name: "Dinner",   amount: "$3,120", covers: 28, pct: 64 },
  { name: "Late",     amount: "$670",   covers: 5,  pct: 14 },
];

const TOP_SERVERS = [
  { name: "Sarah K.",  sales: "$1,847", covers: 14 },
  { name: "Marcus T.", sales: "$1,420", covers: 11 },
  { name: "Priya L.",  sales: "$982",   covers: 8 },
  { name: "Jordan R.", sales: "$643",   covers: 6 },
];

export default async function RevenuePage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics" role={role ?? undefined}>
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Revenue Deep Dive</h1>
          <div className="analytics-period-bar" style={{ paddingTop: 0, marginTop: 8 }}>
            {["Date", "Weekly", "Monthly", "YTD"].map((p) => (
              <button key={p} type="button" className={`analytics-period-btn${p === "Weekly" ? " analytics-period-btn--active" : ""}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="analytics-kpi-grid" style={{ margin: "8px 16px 16px" }}>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">$4,892</p>
            <p className="analytics-kpi__label">Total Revenue</p>
          </div>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">$103</p>
            <p className="analytics-kpi__label">Avg / Cover</p>
          </div>
          <div className="analytics-kpi analytics-kpi--wide">
            <p className="analytics-kpi__value">↑ 18%</p>
            <p className="analytics-kpi__label">vs Last Week</p>
            <p className="analytics-kpi__sub">$4,892 vs $4,147</p>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px" }}>Revenue by Channel</p>
        <div className="analytics-list">
          {CHANNELS.map((c) => (
            <div key={c.name} className="analytics-rank-row" style={{ padding: "12px 16px" }}>
              <span className="analytics-rank-name">{c.name}</span>
              <div className="analytics-rank-bar-wrap" style={{ flex: 1, margin: "0 12px" }}>
                <div className="analytics-rank-bar" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="analytics-rank-value">{c.amount}</span>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>By Daypart</p>
        <div className="analytics-list">
          {DAYPARTS.map((d) => (
            <div key={d.name} className="analytics-daypart-row">
              <div style={{ flex: 1 }}>
                <p className="analytics-daypart-name">{d.name}</p>
                <p className="analytics-issue-date">{d.covers} covers</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="analytics-daypart-amount">{d.amount}</p>
                <p className="analytics-issue-date">{d.pct}% of total</p>
              </div>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>Top Servers</p>
        <div className="analytics-list">
          {TOP_SERVERS.map((s) => (
            <div key={s.name} className="analytics-adj-row">
              <span className="analytics-adj-reason">{s.name}</span>
              <span className="analytics-adj-count">{s.covers} covers</span>
              <span className="analytics-adj-total">{s.sales}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
