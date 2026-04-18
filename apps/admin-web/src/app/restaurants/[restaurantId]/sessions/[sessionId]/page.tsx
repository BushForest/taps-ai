import type { Route } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminShell } from "../../../../../components/admin-shell";
import { fetchSessionDetail } from "../../../../../lib/api-client";
import { formatCurrency } from "../../../../../lib/format";
import { getRoleFromCookie } from "../../../../../lib/auth";

function formatTimeActive(openedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
  if (diff < 1) return "Just seated";
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatSeatedTime(openedAt: string): string {
  return new Date(openedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function resolveStatusInfo(sessionStatus: string, assistRequested?: boolean): { dot: string; label: string } {
  if (assistRequested) return { dot: "#ef4444", label: "Assistance Requested" };
  switch (sessionStatus) {
    case "payment_in_progress": return { dot: "#d4882e", label: "Paying" };
    case "partially_paid": return { dot: "#d4882e", label: "Partially Paid" };
    case "fully_paid": return { dot: "#5fad7e", label: "Fully Paid" };
    case "active": return { dot: "#ff9500", label: "Waiting on Food" };
    default: return { dot: "#5b8ef5", label: "Just Seated" };
  }
}

export default async function SessionDetailPage(props: {
  params: Promise<{ restaurantId: string; sessionId: string }>;
}) {
  const { restaurantId, sessionId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const detail = await fetchSessionDetail(restaurantId, sessionId);

  const tableNum = detail.session.tableId.replace(/^table_?/i, "").replace(/_/g, " ").trim().toUpperCase();
  const totalCents = detail.check?.totalCents ?? 0;
  const paidCents = detail.check?.amountPaidCents ?? 0;
  const remainingCents = detail.check?.remainingBalanceCents ?? 0;
  const taxCents = Math.round(totalCents * 0.13);
  const subtotalCents = totalCents - taxCents;
  const timeActive = formatTimeActive(detail.session.openedAt);
  const seatedTime = formatSeatedTime(detail.session.openedAt);
  const statusInfo = resolveStatusInfo(detail.session.status);
  const guestCount = detail.payers.length || "—";
  const lines = detail.check?.lines?.filter((l) => !l.parentLineId) ?? [];

  return (
    <AdminShell restaurantId={restaurantId} activeTab="floor" role={role ?? undefined}>
      {/* Nav */}
      <div className="table-detail-nav">
        <Link href={`/restaurants/${restaurantId}/sessions` as Route} className="table-detail-back">←</Link>
        <span className="table-detail-title">TABLE {tableNum}</span>
        <span className="admin-app-badge">Admin</span>
      </div>

      {/* Status */}
      <div className="table-detail-status-row">
        <span className="table-detail-status-dot" style={{ background: statusInfo.dot }} />
        <span className="table-detail-status-label">{statusInfo.label}</span>
        <span className="table-detail-status-time">{timeActive}</span>
      </div>

      {/* Stats row */}
      <div className="table-detail-stats-row">
        <div className="table-detail-stat">
          <span className="table-detail-stat__label">Guests</span>
          <span className="table-detail-stat__value">{guestCount}</span>
        </div>
        <div className="table-detail-stat">
          <span className="table-detail-stat__label">Server</span>
          <span className="table-detail-stat__value" style={{ fontSize: 13 }}>—</span>
        </div>
        <div className="table-detail-stat">
          <span className="table-detail-stat__label">Seated</span>
          <span className="table-detail-stat__value" style={{ fontSize: 12 }}>{seatedTime}</span>
        </div>
      </div>

      {/* Order heading */}
      <div className="table-detail-order-heading">
        Current Order <span>· Sent to Kitchen</span>
      </div>

      {/* Line items */}
      <div className="table-detail-lines">
        {lines.length === 0 ? (
          <div className="table-detail-line">
            <div className="table-detail-line__info">
              <div className="table-detail-line__name" style={{ color: "#555555" }}>No items yet</div>
            </div>
          </div>
        ) : (
          lines.map((line) => {
            const modifiers = (line as { modifiers?: Array<{ value: string }> }).modifiers;
            const modText = modifiers?.map((m) => m.value).join(" · ");
            return (
              <div key={line.id} className="table-detail-line">
                <div className="table-detail-line__info">
                  <div className="table-detail-line__name">{line.name}</div>
                  {modText && <div className="table-detail-line__modifier">{modText}</div>}
                </div>
                <div className="table-detail-line__price">{formatCurrency(line.grossCents)}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="table-detail-totals">
        <div className="table-detail-total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotalCents)}</span>
        </div>
        <div className="table-detail-total-row">
          <span>Tax (13%)</span>
          <span>{formatCurrency(taxCents)}</span>
        </div>
        {paidCents > 0 && (
          <div className="table-detail-total-row" style={{ color: "#5fad7e" }}>
            <span>Paid</span>
            <span>−{formatCurrency(paidCents)}</span>
          </div>
        )}
        <div className="table-detail-total-row table-detail-total-row--grand">
          <span>Total</span>
          <span>{formatCurrency(remainingCents > 0 ? remainingCents : totalCents)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="table-detail-actions">
        <Link
          href={`/restaurants/${restaurantId}/sessions/${sessionId}/edit` as Route}
          className="table-detail-action-btn"
        >
          Edit Order
        </Link>
        <Link
          href={`/restaurants/${restaurantId}/sessions/${sessionId}/adjust` as Route}
          className="table-detail-action-btn table-detail-action-btn--gold"
        >
          Adjust Bill
        </Link>
        <Link
          href={`/restaurants/${restaurantId}/sessions/${sessionId}/flag` as Route}
          className="table-detail-action-btn table-detail-action-btn--danger"
        >
          Flag Issue
        </Link>
      </div>
    </AdminShell>
  );
}
