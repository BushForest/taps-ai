"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { Route } from "next";
import { AdminShell } from "../../../../components/admin-shell";

const ACTIVE_PROMOS = [
  {
    id: "1",
    name: "Grand Opening 20%",
    type: "Percentage",
    value: "20%",
    used: "47/100",
    limit: "1 each",
    end: "Mar 31",
    active: true,
  },
  {
    id: "2",
    name: "Happy Hour 15% Off",
    type: "Percentage",
    value: "15%",
    used: "29/100",
    limit: "2 each",
    end: "Mar 29",
    active: true,
  },
  {
    id: "3",
    name: "Weekend Brunch BOGO",
    type: "BOGO",
    value: "BOGO",
    used: "9/200",
    limit: "5 each",
    end: "Apr 6",
    active: false,
  },
];

const EXPIRED = [
  { name: "Valentine's 15% Off", value: "15%  /  1/50", end: "Feb 14" },
  { name: "New Year Special $25", value: "$25  /  31/100", end: "Jan 1" },
];

export default function PromosPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = use(props.params);
  const [promoName, setPromoName] = useState("");
  const [discountType, setDiscountType] = useState("Percentage");
  const [value, setValue] = useState("");
  const [perGuest, setPerGuest] = useState("2");
  const [maxUses, setMaxUses] = useState("100");
  const [startDate, setStartDate] = useState("Apr 4, 2026");
  const [endDate, setEndDate] = useState("May 24, 2026");

  return (
    <AdminShell restaurantId={restaurantId} activeTab="analytics">
      <Link href={`/restaurants/${restaurantId}/analytics` as Route} className="admin-back-btn-inline">← Analytics</Link>
      <div style={{ margin: "0 -16px" }}>
        <div className="analytics-sub-header">
          <h1 className="analytics-sub-title">Promo Assignment</h1>
        </div>

        {/* Create form */}
        <div className="promo-create-card">
          <p className="admin-section-label" style={{ margin: "0 0 12px" }}>✦ Create New Promo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="admin-input"
              placeholder="e.g. Grand Opening 20% Off"
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <p className="promo-field-label">Discount Type</p>
                <select className="admin-input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                  <option>BOGO</option>
                </select>
              </div>
              <div>
                <p className="promo-field-label">Value</p>
                <input className="admin-input" placeholder="20%" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <p className="promo-field-label">Per Guest Limit</p>
                <input className="admin-input" type="number" value={perGuest} onChange={(e) => setPerGuest(e.target.value)} />
              </div>
              <div>
                <p className="promo-field-label">Total Uses Cap</p>
                <input className="admin-input" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <p className="promo-field-label">Start Date</p>
                <input className="admin-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <p className="promo-field-label">End Date</p>
                <input className="admin-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <p className="promo-legal">Why add an end date? Promos without end dates run until manually turned off.</p>
            <button type="button" className="promo-create-btn">✦ Create Promo</button>
          </div>
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 4 }}>Active Promos ◈</p>
        <div className="analytics-list">
          {ACTIVE_PROMOS.map((promo) => (
            <div key={promo.id} className="promo-row">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p className="promo-name">{promo.name}</p>
                  {!promo.active && <span className="promo-paused-badge">Paused</span>}
                </div>
                <p className="promo-meta">{promo.value}  ·  {promo.used}  ·  {promo.limit}</p>
                <p className="promo-dates">Ends {promo.end}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <button type="button" className={`promo-toggle-btn${promo.active ? " promo-toggle-btn--active" : ""}`}>
                  {promo.active ? "Active" : "Paused"}
                </button>
                <button type="button" className="promo-edit-btn">Edit</button>
              </div>
            </div>
          ))}
        </div>

        <p className="admin-section-label" style={{ padding: "0 16px", marginTop: 16 }}>Expired</p>
        <div className="analytics-list">
          {EXPIRED.map((p) => (
            <div key={p.name} className="promo-row promo-row--expired">
              <div style={{ flex: 1 }}>
                <p className="promo-name promo-name--muted">{p.name}</p>
                <p className="promo-meta">{p.value}</p>
              </div>
              <p className="promo-dates">Ended {p.end}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
