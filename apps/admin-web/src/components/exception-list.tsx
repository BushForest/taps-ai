"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { AdminExceptionSummary } from "@taps/contracts";
import { ApiError, resolveException } from "../lib/api-client";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function exceptionIcon(type: string): string {
  if (type.includes("assist")) return "▲";
  if (type.includes("wait") || type.includes("long")) return "⏱";
  if (type.includes("kitchen")) return "🍽";
  if (type.includes("payment")) return "💳";
  return "!";
}

function ExceptionCard(props: {
  exception: AdminExceptionSummary;
  restaurantId: string;
  onResolved: (id: string) => void;
}) {
  const { exception, restaurantId } = props;
  const [resolving, setResolving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleResolve() {
    setResolving(true);
    setErr(null);
    try {
      await resolveException(exception.id);
      props.onResolved(exception.id);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to resolve");
      setResolving(false);
    }
  }

  const cardCls = exception.severity === "critical"
    ? "exception-card exception-card--critical"
    : "exception-card exception-card--warning";

  return (
    <div className={cardCls}>
      <div className="exception-card__head">
        <div className="exception-card__icon-title">
          <span className="exception-card__icon">{exceptionIcon(exception.type)}</span>
          <span className="exception-card__title">{exception.summary}</span>
        </div>
        <span className="exception-card__time">{timeAgo(exception.detectedAt)}</span>
      </div>

      {exception.sessionId && (
        <div className="exception-card__table-info">
          Session {exception.sessionId.replace("sess_", "").toUpperCase()}
        </div>
      )}

      {exception.details && typeof exception.details.description === "string" && (
        <div className="exception-card__description">{exception.details.description as string}</div>
      )}

      {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{err}</p>}

      <div className="exception-card__actions">
        {exception.sessionId && (
          <Link
            href={`/restaurants/${restaurantId}/sessions/${exception.sessionId}` as Route}
            className="exception-btn exception-btn--primary"
          >
            View Session
          </Link>
        )}
        <button
          type="button"
          className="exception-btn exception-btn--secondary"
          onClick={handleResolve}
          disabled={resolving || exception.status !== "open"}
        >
          {resolving ? "Resolving…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}

export function ExceptionList(props: { restaurantId: string; exceptions: AdminExceptionSummary[] }) {
  const [exceptions, setExceptions] = useState(props.exceptions);

  const critical = exceptions.filter((e) => e.severity === "critical" && e.status === "open");
  const warnings = exceptions.filter((e) => e.severity !== "critical" && e.status === "open");
  const resolved = exceptions.filter((e) => e.status === "resolved" || e.status === "ignored");
  const openCount = critical.length + warnings.length;

  function handleResolved(id: string) {
    setExceptions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "resolved" as const } : e))
    );
  }

  return (
    <div>
      <div className="exception-page-header">
        <span className="exception-page-title">
          {openCount > 0 ? `${openCount} Active Exception${openCount !== 1 ? "s" : ""}` : "No Active Exceptions"}
        </span>
        {openCount > 0 && (
          <div className="exception-live-badge">
            <span className="exception-live-dot" />
            Live
          </div>
        )}
      </div>

      {critical.length > 0 && (
        <>
          <div className="exception-section-label">Critical</div>
          {critical.map((e) => (
            <ExceptionCard key={e.id} exception={e} restaurantId={props.restaurantId} onResolved={handleResolved} />
          ))}
        </>
      )}

      {warnings.length > 0 && (
        <>
          <div className="exception-section-label">Warnings</div>
          {warnings.map((e) => (
            <ExceptionCard key={e.id} exception={e} restaurantId={props.restaurantId} onResolved={handleResolved} />
          ))}
        </>
      )}

      {openCount === 0 && resolved.length === 0 && (
        <div style={{ textAlign: "center", color: "#555555", padding: "40px 20px", fontSize: 14 }}>
          No exceptions — all clear
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <div className="exception-section-label">Resolved Today</div>
          {resolved.map((e) => (
            <div key={e.id} className="exception-resolved-row">
              <span className="exception-resolved-check">✓</span>
              <div>
                <div className="exception-resolved-label">{e.summary}</div>
                <div className="exception-resolved-sub">Resolved {timeAgo(e.resolvedAt ?? e.detectedAt)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
