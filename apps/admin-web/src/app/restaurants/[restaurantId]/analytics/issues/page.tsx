import Link from "next/link";
import type { Route } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "../../../../../components/admin-shell";
import { getRoleFromCookie } from "../../../../../lib/auth";

const ISSUES = [
  { table: "Table 4", type: "Food Quality",      severity: "high",   amount: "-$68",  date: "Mar 23" },
  { table: "Table 9", type: "Long Wait",          severity: "medium", amount: "—",     date: "Mar 22" },
  { table: "Table 2", type: "Customer Complaint", severity: "high",   amount: "-$36",  date: "Mar 21" },
  { table: "Table 7", type: "Wrong Item",         severity: "low",    amount: "-$24",  date: "Mar 20" },
  { table: "Table 11",type: "Staff Issue",        severity: "medium", amount: "—",     date: "Mar 18" },
];

const ADJUSTMENTS = [
  { reason: "Sent Back",   count: 8,  total: "-$324" },
  { reason: "Comp",        count: 5,  total: "-$210" },
  { reason: "Wrong Item",  count: 3,  total: "-$98" },
  { reason: "Complaint",   count: 2,  total: "-$68" },
];

export default async function IssuesPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics" role={role ?? undefined}>
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Issues & Adjustments</h1>
          <div className="analytics-period-bar" style={{ paddingTop: 0, marginTop: 8 }}>
            {["Date", "Weekly", "Monthly", "YTD"].map((p) => (
              <button key={p} type="button" className={`analytics-period-btn${p === "Weekly" ? " analytics-period-btn--active" : ""}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="analytics-kpi-grid" style={{ margin: "8px 16px 16px" }}>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">18</p>
            <p className="analytics-kpi__label">Total Issues</p>
          </div>
          <div className="analytics-kpi">
            <p className="analytics-kpi__value">-$700</p>
            <p className="analytics-kpi__label">Credits Given</p>
          </div>
          <div className="analytics-kpi analytics-kpi--wide">
            <p className="analytics-kpi__value">2.4%</p>
            <p className="analytics-kpi__label">Issue Rate</p>
            <p className="analytics-kpi__sub">↓ 0.8% vs last week</p>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px" }}>Recent Issues</p>
        <div className="analytics-list">
          {ISSUES.map((issue, i) => (
            <div key={i} className="analytics-issue-row">
              <div style={{ flex: 1 }}>
                <p className="analytics-issue-table">{issue.table}</p>
                <p className="analytics-issue-type">{issue.type}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span className={`analytics-issue-sev analytics-issue-sev--${issue.severity}`}>{issue.severity}</span>
                <span className="analytics-issue-amount">{issue.amount}</span>
                <span className="analytics-issue-date">{issue.date}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>Adjustments by Reason</p>
        <div className="analytics-list">
          {ADJUSTMENTS.map((adj) => (
            <div key={adj.reason} className="analytics-adj-row">
              <span className="analytics-adj-reason">{adj.reason}</span>
              <span className="analytics-adj-count">{adj.count}×</span>
              <span className="analytics-adj-total">{adj.total}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
