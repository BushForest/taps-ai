"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminSessionDetailResponse, AdminTableSummary } from "@taps/contracts";
import { ApiError, clearAssistRequest, clearSession, fetchSessionDetail } from "../lib/api-client";
import { formatCurrency } from "../lib/format";

// ─── Table state helpers ──────────────────────────────────────────────────────

type TableState = "empty" | "just_seated" | "eating" | "about_to_pay";

const STATE_COLORS: Record<TableState, { dot: string; bg: string; border: string; label: string }> = {
  empty: { dot: "#555555", bg: "#1a1a1a", border: "#2e2e2e", label: "Available" },
  just_seated: { dot: "#5b8ef5", bg: "rgba(91,142,245,0.08)", border: "rgba(91,142,245,0.3)", label: "Just Seated" },
  eating: { dot: "#5fad7e", bg: "rgba(95,173,126,0.08)", border: "rgba(95,173,126,0.3)", label: "Eating" },
  about_to_pay: { dot: "#d4882e", bg: "rgba(212,136,46,0.08)", border: "rgba(212,136,46,0.3)", label: "About to Pay" }
};

function resolveTableState(sessionStatus?: string, remainingBalanceCents?: number): TableState {
  if (!sessionStatus || sessionStatus === "empty") return "empty";
  if (sessionStatus === "closed" || sessionStatus === "cleared_locked" || sessionStatus === "archived") {
    return "empty";
  }
  if (
    sessionStatus === "payment_in_progress" ||
    sessionStatus === "partially_paid" ||
    sessionStatus === "fully_paid"
  ) {
    return "about_to_pay";
  }
  if (sessionStatus === "active") {
    return (remainingBalanceCents ?? 0) >= 10000 ? "eating" : "just_seated";
  }
  return "eating";
}

function formatTimeActive(openedAt?: string): string | null {
  if (!openedAt) return null;
  const diffMs = Date.now() - new Date(openedAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just seated";
  if (diffMins < 60) return `${diffMins}m`;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Order panel (slide-in) ────────────────────────────────────────────────────

function OrderPanel(props: {
  table: AdminTableSummary;
  restaurantId: string;
  onClose: () => void;
}) {
  const { table, restaurantId, onClose } = props;
  const [detail, setDetail] = useState<AdminSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!table.sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchSessionDetail(restaurantId, table.sessionId)
      .then((data) => setDetail(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [restaurantId, table.sessionId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const timeActive = formatTimeActive(table.openedAt);
  const tableNum = table.tableLabel.replace(/^table_?/i, "").replace(/_/g, " ").trim() || table.tableId;
  const displayLabel = tableNum.length <= 4 ? tableNum.toUpperCase() : `T${tableNum}`;

  return (
    <>
      <div
        className="floor-order-panel__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="floor-order-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Order for Table ${displayLabel}`}
      >
        <div className="floor-order-panel__header">
          <div>
            <div className="floor-order-panel__table-num">TABLE {displayLabel}</div>
            {timeActive && (
              <div className="floor-order-panel__time">Active for {timeActive}</div>
            )}
          </div>
          <button
            type="button"
            className="floor-order-panel__close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="floor-order-panel__loading">Loading order…</div>
        ) : error ? (
          <div className="floor-order-panel__error">{error}</div>
        ) : !detail ? (
          <div className="floor-order-panel__empty">No session data.</div>
        ) : (
          <>
            {/* Balance summary */}
            <div className="floor-order-panel__balance-row">
              <span className="floor-order-panel__balance-label">Outstanding</span>
              <span className="floor-order-panel__balance-value">
                {formatCurrency(detail.check?.remainingBalanceCents ?? table.remainingBalanceCents)}
              </span>
            </div>

            {/* Line items */}
            <div className="floor-order-panel__section-title">Order Items</div>
            {detail.check?.lines && detail.check.lines.length > 0 ? (
              <div className="floor-order-panel__lines">
                {detail.check.lines
                  .filter((line) => !line.parentLineId)
                  .map((line) => (
                    <div key={line.id} className="floor-order-panel__line">
                      <span className="floor-order-panel__line-name">{line.name}</span>
                      <span className="floor-order-panel__line-price">
                        {formatCurrency(line.grossCents)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="floor-order-panel__note">No items on this check yet.</p>
            )}

            {/* Totals */}
            {detail.check && (
              <div className="floor-order-panel__totals">
                <div className="floor-order-panel__total-row">
                  <span>Total</span>
                  <span>{formatCurrency(detail.check.totalCents)}</span>
                </div>
                {detail.check.amountPaidCents > 0 && (
                  <div className="floor-order-panel__total-row floor-order-panel__total-row--paid">
                    <span>Paid</span>
                    <span>−{formatCurrency(detail.check.amountPaidCents)}</span>
                  </div>
                )}
                <div className="floor-order-panel__total-row floor-order-panel__total-row--outstanding">
                  <span>Remaining</span>
                  <span>{formatCurrency(detail.check.remainingBalanceCents)}</span>
                </div>
              </div>
            )}

            {/* Payers */}
            {detail.payers.length > 0 && (
              <>
                <div className="floor-order-panel__section-title">Payers</div>
                <div className="floor-order-panel__payers">
                  {detail.payers.map((payer) => (
                    <div key={payer.id} className="floor-order-panel__payer">
                      <span>{payer.displayName}</span>
                      <span className="floor-order-panel__payer-status">{payer.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Single table card ─────────────────────────────────────────────────────────

function TableCard(props: {
  table: AdminTableSummary;
  restaurantId: string;
  onCleared: (tableId: string) => void;
  onAssistCleared: (tableId: string) => void;
  onSelect: (table: AdminTableSummary) => void;
}) {
  const { table, restaurantId } = props;
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"clear" | "assist" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const assistRequested = table.assistRequested ?? false;
  const state = resolveTableState(table.sessionStatus, table.remainingBalanceCents);
  const colors = STATE_COLORS[state];
  const isEmpty = state === "empty";

  const tableNum = table.tableLabel.replace(/^table_?/i, "").replace(/_/g, " ").trim() || table.tableLabel;
  const displayLabel = tableNum.length <= 4 ? tableNum.toUpperCase() : `T${tableNum}`;

  const timeActive = formatTimeActive(table.openedAt);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!table.sessionId) return;
    setErrorMsg(null);
    setPendingAction("clear");
    startTransition(async () => {
      try {
        await clearSession(table.sessionId!);
        props.onCleared(table.tableId);
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : "Clear failed");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleAssistClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!table.sessionId) return;
    setErrorMsg(null);
    setPendingAction("assist");
    startTransition(async () => {
      try {
        await clearAssistRequest(restaurantId, table.sessionId!);
        props.onAssistCleared(table.tableId);
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : "Failed to clear assist");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleCardClick = () => {
    if (!isEmpty) {
      props.onSelect(table);
    }
  };

  return (
    <div
      className={`floor-table-card${assistRequested && !isEmpty ? " floor-table-card--alarm" : ""}`}
      style={{
        borderLeftColor: assistRequested && !isEmpty ? "#dc2626" : colors.border,
        background: assistRequested && !isEmpty ? undefined : colors.bg,
        opacity: isPending ? 0.72 : 1,
        cursor: isEmpty ? "default" : "pointer"
      }}
      onClick={handleCardClick}
      role={isEmpty ? undefined : "button"}
      tabIndex={isEmpty ? undefined : 0}
      onKeyDown={isEmpty ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") handleCardClick(); }}
    >
      {/* Alarm banner */}
      {assistRequested && !isEmpty ? (
        <div className="floor-alarm-banner">ASSISTANCE REQUESTED</div>
      ) : null}

      {/* Header row */}
      <div className="floor-table-card__head">
        <span className="floor-table-card__num">TABLE {displayLabel}</span>
        <span
          className="floor-table-card__status-badge"
          style={{
            color: assistRequested && !isEmpty ? "#dc2626" : colors.dot,
            background: assistRequested && !isEmpty ? "#fee2e2" : `${colors.dot}18`,
            border: `1px solid ${assistRequested && !isEmpty ? "#fca5a5" : `${colors.dot}44`}`
          }}
        >
          <span
            className={assistRequested && !isEmpty ? "floor-dot floor-dot--pulse" : "floor-dot"}
            style={{ background: assistRequested && !isEmpty ? "#dc2626" : colors.dot }}
          />
          {assistRequested && !isEmpty ? "Needs Attention" : colors.label}
        </span>
      </div>

      {/* Time active badge */}
      {timeActive && !isEmpty ? (
        <span className="floor-table-card__time">{timeActive}</span>
      ) : null}

      {/* Body */}
      {isEmpty ? (
        <div className="floor-table-card__empty">AVAILABLE</div>
      ) : (
        <div className="floor-table-card__body">
          <div className="floor-table-card__stats">
            {table.guestCount != null && table.guestCount > 0 ? (
              <span>{table.guestCount} guests</span>
            ) : null}
          </div>
          {table.remainingBalanceCents > 0 ? (
            <div className="floor-table-card__balance">
              {formatCurrency(table.remainingBalanceCents)}
              <span className="floor-table-card__balance-label"> outstanding</span>
            </div>
          ) : null}
          {table.orderSummary ? (
            <p className="floor-table-card__order">{table.orderSummary}</p>
          ) : null}
          {errorMsg ? <p className="floor-table-card__error">{errorMsg}</p> : null}
          <div
            className="floor-table-card__actions"
            onClick={(e) => e.stopPropagation()}
          >
            {assistRequested ? (
              <button
                type="button"
                className="floor-btn floor-btn--assist"
                onClick={handleAssistClear}
                disabled={isPending}
              >
                {isPending && pendingAction === "assist" ? "..." : "Mark Served"}
              </button>
            ) : null}
            {table.sessionId ? (
              <button
                type="button"
                className="floor-btn floor-btn--clear"
                onClick={handleClear}
                disabled={isPending}
              >
                {isPending && pendingAction === "clear" ? "Clearing..." : "Clear Table"}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat bar ──────────────────────────────────────────────────────────────────

function StatBar(props: { tables: AdminTableSummary[] }) {
  const { tables } = props;

  const activeTables = tables.filter((t) => t.sessionId && t.sessionStatus !== "closed" && t.sessionStatus !== "archived").length;
  const totalOutstandingCents = tables.reduce((sum, t) => sum + t.remainingBalanceCents, 0);
  const assistCount = tables.filter((t) => t.assistRequested).length;

  return (
    <div className="floor-stat-bar">
      <div className="floor-stat-bar__item">
        <span className="floor-stat-bar__value">{activeTables}</span>
        <span className="floor-stat-bar__label">Active Tables</span>
      </div>
      <div className="floor-stat-bar__divider" />
      <div className="floor-stat-bar__item">
        <span className="floor-stat-bar__value">{formatCurrency(totalOutstandingCents)}</span>
        <span className="floor-stat-bar__label">Total Outstanding</span>
      </div>
      <div className="floor-stat-bar__divider" />
      <div className="floor-stat-bar__item">
        <span
          className="floor-stat-bar__value"
          style={assistCount > 0 ? { color: "#dc2626" } : undefined}
        >
          {assistCount}
        </span>
        <span
          className="floor-stat-bar__label"
          style={assistCount > 0 ? { color: "#dc2626" } : undefined}
        >
          {assistCount === 1 ? "Assistance Request" : "Assistance Requests"}
        </span>
      </div>
    </div>
  );
}

// ─── Main grid ─────────────────────────────────────────────────────────────────

export function TableGrid(props: {
  initialTables: AdminTableSummary[];
  restaurantId: string;
  restaurantName?: string;
}) {
  const router = useRouter();
  const [tables, setTables] = useState<AdminTableSummary[]>(props.initialTables);
  const [selectedTable, setSelectedTable] = useState<AdminTableSummary | null>(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setTables(props.initialTables);
  }, [props.initialTables]);

  const handleCleared = useCallback((tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.tableId === tableId
          ? {
              ...t,
              sessionId: undefined,
              sessionStatus: undefined,
              remainingBalanceCents: 0,
              assistRequested: false,
              guestCount: undefined,
              orderSummary: undefined,
              openedAt: undefined
            }
          : t
      )
    );
    setSelectedTable((prev) => (prev?.tableId === tableId ? null : prev));
  }, []);

  const handleAssistCleared = useCallback((tableId: string) => {
    setTables((prev) =>
      prev.map((t) => (t.tableId === tableId ? { ...t, assistRequested: false } : t))
    );
  }, []);

  const handleSelect = useCallback((table: AdminTableSummary) => {
    setSelectedTable(table);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTable(null);
  }, []);

  return (
    <div className="floor-view">
      <StatBar tables={tables} />

      <div className="floor-grid">
        {tables.map((table) => (
          <TableCard
            key={table.tableId}
            table={table}
            restaurantId={props.restaurantId}
            onCleared={handleCleared}
            onAssistCleared={handleAssistCleared}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {selectedTable ? (
        <OrderPanel
          table={selectedTable}
          restaurantId={props.restaurantId}
          onClose={handleClosePanel}
        />
      ) : null}
    </div>
  );
}
