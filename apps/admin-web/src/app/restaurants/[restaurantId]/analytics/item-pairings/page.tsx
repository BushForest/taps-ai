import Link from "next/link";
import type { Route } from "next";
import { AdminShell } from "../../../../../components/admin-shell";

const PAIRINGS = [
  { a: "Ribeye Steak", b: "Red Wine",       count: "38×", revenue: "$1,224" },
  { a: "Caesar Salad", b: "Sparkling Water", count: "14×", revenue: "$368" },
  { a: "Wagyu Tartare", b: "Champagne",      count: "11×", revenue: "$1,089" },
  { a: "Truffle Fries", b: "Craft Beer",     count: "9×",  revenue: "$288" },
  { a: "Salmon",       b: "Sauvignon Blanc", count: "9×",  revenue: "$270" },
];

const UPSELL = [
  { item: "Lobster Bisque",  suggest: "Wine Pairing",     pct: "62%" },
  { item: "Filet Mignon",    suggest: "Cabernet Sauvignon", pct: "51%" },
  { item: "Crème Brûlée",   suggest: "Passito di Martini", pct: "49%" },
];

export default async function ItemPairingsPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics">
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Item Pairings</h1>
          <div className="analytics-period-bar" style={{ paddingTop: 0, marginTop: 8 }}>
            {["Date", "Weekly", "Monthly", "YTD"].map((p) => (
              <button key={p} type="button" className={`analytics-period-btn${p === "Weekly" ? " analytics-period-btn--active" : ""}`}>{p}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, padding: "0 16px" }}>
            <button type="button" className="analytics-filter-btn analytics-filter-btn--active">Most Paired</button>
            <button type="button" className="analytics-filter-btn">By Category</button>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px" }}>Top Pairings</p>
        <div className="analytics-list">
          {PAIRINGS.map((pair, i) => (
            <div key={i} className="analytics-pairing-row">
              <div className="analytics-pairing-items">
                <span className="analytics-pairing-name">{pair.a}</span>
                <span className="analytics-pairing-plus">+</span>
                <span className="analytics-pairing-name">{pair.b}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="analytics-pairing-count">{pair.count}</span>
                <span className="analytics-pairing-revenue">{pair.revenue}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>Upsell Opportunities</p>
        <div className="analytics-list">
          {UPSELL.map((u) => (
            <div key={u.item} className="analytics-upsell-row">
              <div>
                <p className="analytics-upsell-item">{u.item}</p>
                <p className="analytics-upsell-suggest">Suggest: {u.suggest}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span className="analytics-upsell-pct">{u.pct} upsell</span>
                <button type="button" className="analytics-suggest-btn">Create Suggestion</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
