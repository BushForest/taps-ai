import type { CSSProperties } from "react";
import { titleCaseStatus } from "../lib/format";

const COLORS: Record<string, { background: string; color: string; border: string }> = {
  active: { background: "#f5f1ea", color: "#5e4d3d", border: "#dcccb8" },
  payment_in_progress: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  partially_paid: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  fully_paid: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  fully_paid_pending_close: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  closed: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  cleared_locked: { background: "#fceeed", color: "#8a3a32", border: "#e7c2bc" },
  public_expired: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  archived: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  completed: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  open: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  updated: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  item: { background: "#f4f1ec", color: "#5a4a3d", border: "#d9cdbf" },
  modifier: { background: "#faf4ea", color: "#7a5a14", border: "#ecd7ae" },
  condiment: { background: "#faf4ea", color: "#7a5a14", border: "#ecd7ae" },
  tax: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  fee: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  discount: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  unassigned: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  partially_assigned: { background: "#fff9ef", color: "#7a5a14", border: "#efd9a7" },
  fully_assigned: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  info: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  warning: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  critical: { background: "#fceeed", color: "#8a3a32", border: "#e7c2bc" },
  open_exception: { background: "#fceeed", color: "#8a3a32", border: "#e7c2bc" },
  investigating: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  resolved: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  ignored: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  captured: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  provider_succeeded_pending_pos: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  reconciled: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  draft: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  intent_created: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  authorization_pending: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  authorized: { background: "#eef5fb", color: "#24597a", border: "#c5d9e8" },
  capture_pending: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  failed: { background: "#fceeed", color: "#8a3a32", border: "#e7c2bc" },
  voided: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  refunded: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  pending: { background: "#fff7e9", color: "#7a5a14", border: "#efd9a7" },
  attached: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  not_required: { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" },
  in_sync: { background: "#eef8f0", color: "#29613b", border: "#c7e4cf" },
  out_of_sync: { background: "#fceeed", color: "#8a3a32", border: "#e7c2bc" }
};

export function StatusPill(props: { value?: string }) {
  const colors = COLORS[props.value ?? ""] ?? { background: "#f2f3f7", color: "#404b5c", border: "#d0d5df" };

  return (
    <span
      className="status-pill"
      style={
        {
          background: colors.background,
          color: colors.color,
          border: `1px solid ${colors.border}`
        } satisfies CSSProperties
      }
    >
      {titleCaseStatus(props.value)}
    </span>
  );
}
