import type { CSSProperties } from "react";
import { titleCaseStatus } from "../lib/format";

const toneByStatus: Record<string, { background: string; color: string; border: string }> = {
  active: { background: "#eef7ec", color: "#20542a", border: "#b7d8ba" },
  payment_in_progress: { background: "#fff4df", color: "#7a4b11", border: "#dfbf7d" },
  partially_paid: { background: "#eef4ff", color: "#12417a", border: "#b8cef2" },
  fully_paid: { background: "#ecfdf3", color: "#12603a", border: "#9fd0b1" },
  closed: { background: "#edf8ef", color: "#20542a", border: "#b7d8ba" },
  cleared_locked: { background: "#fff1ef", color: "#8a2f23", border: "#ebb6af" },
  public_expired: { background: "#f5efe6", color: "#5e4d3b", border: "#d9ccb9" },
  archived: { background: "#f3f4f6", color: "#49525f", border: "#ced3da" },
  completed: { background: "#eef7ec", color: "#20542a", border: "#b7d8ba" },
  unassigned: { background: "#fff4df", color: "#7a4b11", border: "#dfbf7d" },
  partially_assigned: { background: "#fff7e9", color: "#7a5a14", border: "#e7cf97" },
  fully_assigned: { background: "#eef7ec", color: "#20542a", border: "#b7d8ba" }
};

export function StatusPill(props: { value: string }) {
  const tone = toneByStatus[props.value] ?? {
    background: "#f5f1eb",
    color: "#5c4b35",
    border: "#d8ccb8"
  };

  return (
    <span
      className="status-pill"
      style={
        {
          background: tone.background,
          color: tone.color,
          border: `1px solid ${tone.border}`
        } satisfies CSSProperties
      }
    >
      {titleCaseStatus(props.value)}
    </span>
  );
}
