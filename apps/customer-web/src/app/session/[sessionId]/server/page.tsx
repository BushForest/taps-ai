"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import Link from "next/link";
import { use } from "react";
import { apiPost } from "../../../../lib/api-client";

const QUICK_REQUESTS_ROW1 = [
  { id: "water", label: "Water", icon: "💧" },
  { id: "utensils", label: "Utensils", icon: "🍽" },
  { id: "ice", label: "Ice", icon: "🧊" },
];
const QUICK_REQUESTS_ROW2 = [
  { id: "refill", label: "Refill", icon: "🫗" },
  { id: "other", label: "Other", icon: "✨" },
];
const SERVER_NAME = "Marcus";

export default function RequestServerPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const [selected, setSelected] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => (prev === id ? null : id));
  }

  function handleSend() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const msg = customMessage.trim();
        await apiPost(`/public/sessions/${publicToken}/assist`, {
          type: selected,
          ...(selected === "other" && msg ? { message: msg } : {}),
        });
      } catch {
        // best-effort — still show success to guest
      }
      setSent(true);
    });
  }

  return (
    <div className="server-page">
      {/* Header */}
      <div className="server-header">
        <Link
          href={`/session/${publicToken}/menu`}
          className="signin-back-btn"
          aria-label="Back"
        >
          ‹
        </Link>
        <span className="signin-brand">Black+Blue Toronto</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Hero area */}
      <div className="server-hero">
        <div className="server-hero__photo">
          <Image
            src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=80"
            alt="Your server"
            fill
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
          <div className="server-hero__photo-overlay" />
        </div>
        <div className="server-hero__text">
          <span className="server-hero__icon">🛎</span>
          <h1 className="server-title">Request Server</h1>
          <p className="server-name">{SERVER_NAME} is your server</p>
        </div>
      </div>

      {/* Availability card */}
      <div className="server-body">
        <div className="server-available-banner">
          <span className="server-available-dot">●</span> {SERVER_NAME} is available
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>Request sent!</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>{SERVER_NAME} will be with you shortly.</p>
            <Link href={`/session/${publicToken}/menu`} className="bb-btn-gold" style={{ marginTop: 24, display: "flex" }}>
              Back to Menu
            </Link>
          </div>
        ) : (
          <>
            <p className="quick-requests-label">QUICK REQUESTS</p>
            <div className="request-tiles">
              {QUICK_REQUESTS_ROW1.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  className={`request-tile${selected === req.id ? " request-tile--selected" : ""}`}
                  onClick={() => toggle(req.id)}
                >
                  <span className="request-tile__icon">{req.icon}</span>
                  <span className="request-tile__label">{req.label}</span>
                </button>
              ))}
            </div>
            <div className="request-tiles request-tiles--row2">
              {QUICK_REQUESTS_ROW2.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  className={`request-tile${selected === req.id ? " request-tile--selected" : ""}`}
                  onClick={() => toggle(req.id)}
                >
                  <span className="request-tile__icon">{req.icon}</span>
                  <span className="request-tile__label">{req.label}</span>
                </button>
              ))}
            </div>

            {selected === "other" ? (
              <textarea
                className="notes-textarea"
                placeholder="Describe your request…"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                style={{ marginTop: 8 }}
              />
            ) : null}

            <button
              type="button"
              className="server-send-btn"
              disabled={!selected || isPending}
              onClick={handleSend}
            >
              {isPending ? "Sending…" : "🛎 Send Request"}
            </button>
            <Link
              href={`/session/${publicToken}/menu`}
              className="btn-ghost"
              style={{ textAlign: "center", display: "block", color: "var(--muted)", fontSize: 14 }}
            >
              Cancel
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
