"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { Route } from "next";
import { AdminShell } from "../../../../../../components/admin-shell";

const ISSUE_TYPES = [
  "Customer Complaint",
  "Food Quality",
  "Long Wait",
  "Staff Issue",
  "Safety Concern",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High"] as const;
type Priority = typeof PRIORITIES[number];

const ITEMS = [
  { id: "1", name: "Caesar Salad x2", price: "$36" },
  { id: "2", name: "Red Wine x3",     price: "$54" },
];

export default function FlagIssuePage(props: {
  params: Promise<{ restaurantId: string; sessionId: string }>;
}) {
  const { restaurantId, sessionId } = use(props.params);
  const [issueType, setIssueType] = useState("Customer Complaint");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [description, setDescription] = useState("Customer reports finding hair in their Caesar Salad. Requesting manager visit to table...");
  const [selected, setSelected] = useState<string[]>(["1"]);
  const [notifyManager, setNotifyManager] = useState(true);

  function toggleItem(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <AdminShell restaurantId={restaurantId} activeTab="sessions">
      <header className="admin-sub-header">
        <Link href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route} className="admin-back-btn" aria-label="Back">←</Link>
        <span className="admin-sub-header__title">Flag Issue · Table 6</span>
      </header>

      <div className="admin-sub-body">
        <p className="admin-section-label">Issue Type</p>
        <div className="flag-types">
          {ISSUE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`flag-type-btn${issueType === type ? " flag-type-btn--active" : ""}`}
              onClick={() => setIssueType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <p className="admin-section-label">Priority</p>
        <div className="flag-priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              className={`flag-priority-btn flag-priority-btn--${p.toLowerCase()}${priority === p ? " flag-priority-btn--active" : ""}`}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <p className="admin-section-label">Description</p>
        <textarea
          className="admin-textarea"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue..."
        />

        <p className="admin-section-label">Affected Items (Optional)</p>
        <div className="adj-items">
          {ITEMS.map((item) => (
            <label key={item.id} className="adj-item-row">
              <input
                type="checkbox"
                className="adj-checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggleItem(item.id)}
              />
              <span className="adj-item-name">{item.name}</span>
              <span className="adj-item-price">{item.price}</span>
            </label>
          ))}
        </div>

        <div className="adj-approval-row">
          <span className="adj-approval-label">Notify Manager Immediately</span>
          <button
            type="button"
            className={`toggle-btn${notifyManager ? " toggle-btn--on" : ""}`}
            onClick={() => setNotifyManager(!notifyManager)}
            role="switch"
            aria-checked={notifyManager}
          >
            <span className="toggle-btn__thumb" />
          </button>
        </div>

        <button type="button" className="adj-submit-btn" style={{ width: "100%", marginTop: 8 }}>
          Submit Flag
        </button>
        <Link href={`/restaurants/${restaurantId}/sessions/${sessionId}` as Route} className="adj-cancel-btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
          Cancel
        </Link>
      </div>
    </AdminShell>
  );
}
