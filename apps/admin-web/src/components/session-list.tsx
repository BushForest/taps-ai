"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { AdminTableSummary } from "@taps/contracts";
import { formatCurrency } from "../lib/format";
import { ApiError, clearSession } from "../lib/api-client";

type Filter = "all" | "eating" | "paying";

function resolveStatusLabel(
  sessionStatus?: string,
  assistRequested?: boolean
): { label: string; cls: string } {
  if (assistRequested) return { label: "Assistance", cls: "session-card__status-assist" };
  if (!sessionStatus || sessionStatus === "closed" || sessionStatus === "archived")
    return { label: "Available", cls: "session-card__status-default" };
  if (sessionStatus === "payment_in_progress" || sessionStatus === "partially_paid" || sessionStatus === "fully_paid")
    return { label: "Portion Paid", cls: "session-card__status-paying" };
  if (sessionStatus === "active") return { label: "Eating", cls: "session-card__status-eating" };
  return { label: "Just Seated", cls: "session-card__status-seated" };
}

function formatTimeActive(openedAt?: string): string | null {
  if (!openedAt) return null;
  const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
  if (diff < 1) return "Just seated";
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TableCard(props: {
  table: AdminTableSummary;
  restaurantId: string;
  onCleared: (tableId: string) => void;
}) {
  const { table, restaurantId } = props;
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tableNum = table.tableLabel.replace(/^table_?/i, "").replace(/_/g, " ").trim() || table.tableId;
  const displayNum = tableNum.toUpperCase();
  const status = resolveStatusLabel(table.sessionStatus, table.assistRequested);
  const time = formatTimeActive(table.openedAt);
  const isEmpty = !table.sessionId || table.sessionStatus === "closed" || table.sessionStatus === "archived";

  async function handleClear() {
    if (!table.sessionId) return;
    setClearing(true);
    setErr(null);
    try {
      await clearSession(table.sessionId);
      props.onCleared(table.tableId);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  }

  if (isEmpty) return null;

  return (
    <div className="session-card">
      <div className="session-card__head">
        <span className="session-card__table-label">TABLE {displayNum}</span>
        <span className={status.cls}>{status.label}</span>
      </div>

      <div className="session-card__balance">{formatCurrency(table.remainingBalanceCents)}</div>

      <div className="session-card__meta">
        {table.guestCount ? `${table.guestCount} guests` : "—"}
        {time ? ` · ${time}` : ""}
      </div>

      <div className="session-card__server-row">
        <span className="session-card__server">
          {table.orderSummary ? table.orderSummary : "No items yet"}
        </span>
      </div>

      {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{err}</p>}

      <div className="session-card__actions">
        <Link
          href={`/restaurants/${restaurantId}/sessions/${table.sessionId}` as Route}
          className="session-card__btn"
        >
          View Order
        </Link>
        <button
          type="button"
          className="session-card__btn"
          onClick={handleClear}
          disabled={clearing}
        >
          {clearing ? "Clearing…" : "Clear"}
        </button>
      </div>
    </div>
  );
}

export function SessionList(props: { restaurantId: string; tables: AdminTableSummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [tables, setTables] = useState(props.tables);

  const activeTables = tables.filter((t) => t.sessionId && t.sessionStatus !== "closed" && t.sessionStatus !== "archived");
  const eatingTables = activeTables.filter((t) => t.sessionStatus === "active" && !t.assistRequested);
  const payingTables = activeTables.filter((t) => ["payment_in_progress", "partially_paid", "fully_paid"].includes(t.sessionStatus ?? ""));

  const filtered =
    filter === "eating" ? eatingTables :
    filter === "paying" ? payingTables :
    activeTables;

  function handleCleared(tableId: string) {
    setTables((prev) => prev.map((t) =>
      t.tableId === tableId
        ? { ...t, sessionId: undefined, sessionStatus: undefined, remainingBalanceCents: 0, assistRequested: false, guestCount: undefined, orderSummary: undefined, openedAt: undefined }
        : t
    ));
  }

  return (
    <div>
      <div className="session-filter-bar">
        <button type="button" className={`session-pill${filter === "all" ? " session-pill--active" : ""}`} onClick={() => setFilter("all")}>
          All ({activeTables.length})
        </button>
        <button type="button" className={`session-pill${filter === "eating" ? " session-pill--active" : ""}`} onClick={() => setFilter("eating")}>
          Eating ({eatingTables.length})
        </button>
        <button type="button" className={`session-pill${filter === "paying" ? " session-pill--active" : ""}`} onClick={() => setFilter("paying")}>
          Paying ({payingTables.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555555", padding: "40px 20px", fontSize: 14 }}>
          No active sessions
        </div>
      ) : (
        filtered.map((table) => (
          <TableCard
            key={table.tableId}
            table={table}
            restaurantId={props.restaurantId}
            onCleared={handleCleared}
          />
        ))
      )}
    </div>
  );
}
