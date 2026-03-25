"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { Route } from "next";

const DIETARY_TAGS = ["No Shellfish", "Vegetarian", "Vegan", "No Nuts", "Gluten Free", "Dairy Free", "Halal", "Kosher"];
const SEATING = ["Indoor", "Outdoor"];

export default function PreferencesPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const [selected, setSelected] = useState<string[]>(["No Shellfish"]);
  const [seating, setSeating] = useState("Indoor");
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promos, setPromos] = useState(true);
  const [serverNotifs, setServerNotifs] = useState(false);

  function toggleTag(tag: string) {
    setSelected((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Preferences</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="subprofile-body">
        <p className="subprofile-section-label">Dietary Preferences</p>
        <div className="pref-tags">
          {DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`pref-tag${selected.includes(tag) ? " pref-tag--selected" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <p className="subprofile-section-label">Allergies</p>
        <textarea
          className="input"
          rows={3}
          defaultValue="Shellfish allergy – please flag all dishes"
          style={{ resize: "none" }}
        />

        <p className="subprofile-section-label">Notifications</p>
        <div className="pref-toggles">
          {[
            { label: "Order Updates", value: orderUpdates, set: setOrderUpdates },
            { label: "Promotions", value: promos, set: setPromos },
            { label: "Server Notifications", value: serverNotifs, set: setServerNotifs },
          ].map(({ label, value, set }) => (
            <div key={label} className="pref-toggle-row">
              <span className="pref-toggle-row__label">{label}</span>
              <button
                type="button"
                className={`toggle-btn${value ? " toggle-btn--on" : ""}`}
                onClick={() => set(!value)}
                aria-checked={value}
                role="switch"
              >
                <span className="toggle-btn__thumb" />
              </button>
            </div>
          ))}
        </div>

        <p className="subprofile-section-label">Seating Preference</p>
        <div className="pref-seating">
          {SEATING.map((s) => (
            <button
              key={s}
              type="button"
              className={`pref-seating-btn${seating === s ? " pref-seating-btn--active" : ""}`}
              onClick={() => setSeating(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
