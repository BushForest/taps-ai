import Link from "next/link";
import { use } from "react";
import type { Route } from "next";

const STATS = [
  { label: "Visits", value: "12" },
  { label: "Total Spent", value: "$1,847" },
  { label: "Avg Rating", value: "4.9" },
];

const ORDERS = [
  { id: "1", date: "Mar 20, 2026", items: "Bone-In Ribeye, Grilled Salmon", table: "Table 10", total: "$127.00" },
  { id: "2", date: "Mar 15, 2026", items: "NY Strip, Caesar Salad", table: "Table 7", total: "$89.50" },
  { id: "3", date: "Mar 8, 2026", items: "Filet Mignon, Lobster Tail, Wine", table: "Table 3", total: "$215.00" },
];

export default function OrderHistoryPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Order History</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="subprofile-body">
        <div className="oh-stats">
          {STATS.map((s) => (
            <div key={s.label} className="oh-stat">
              <p className="oh-stat__value">{s.value}</p>
              <p className="oh-stat__label">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="subprofile-section-label">Recent Orders</p>
        <div className="oh-list">
          {ORDERS.map((order) => (
            <div key={order.id} className="oh-order">
              <div className="oh-order__left">
                <span className="oh-order__date">{order.date}</span>
                <span className="oh-order__items">{order.items}</span>
                <div className="oh-order__meta">
                  {"★★★★★"}
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{order.table}</span>
                </div>
              </div>
              <span className="oh-order__total">{order.total}</span>
            </div>
          ))}
        </div>

        <button type="button" className="btn-ghost" style={{ display: "block", width: "100%", textAlign: "center", color: "var(--gold)" }}>
          View All Orders →
        </button>
      </div>
    </div>
  );
}
