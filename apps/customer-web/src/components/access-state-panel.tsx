import Link from "next/link";
import type { GetSessionStatusResponse } from "@taps/contracts";
import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

export function AccessStatePanel(props: { summary: GetSessionStatusResponse }) {
  const state = props.summary.session?.status ?? props.summary.access.session.status;
  const copy =
    props.summary.access.reason === "cleared"
      ? {
          title: "This table has already been reset",
          message: "The previous party is cleared out and that bill is locked. If you are seated here now, tap the table again to open the current session."
        }
      : props.summary.access.reason === "expired"
        ? {
            title: "This table link expired",
            message: "Guest access closes shortly after the table is finished. Ask staff if the check was reopened, or tap again if you are back at the table."
          }
        : props.summary.access.reason === "archived"
          ? {
              title: "This visit is no longer public",
              message: "The session is now support-only and can no longer be opened from the guest link."
            }
          : {
              title: "This table is unavailable right now",
              message: "The guest link is not active at the moment."
            };

  return (
    <SectionCard tone="warn" eyebrow="Guest Access" title={copy.title}>
      <div className="inline-row">
        <StatusPill value={state} />
        <span className="warn-text" style={{ fontWeight: 700 }}>
          Public access is off
        </span>
      </div>
      <p className="stat-detail" style={{ margin: 0 }}>
        {copy.message}
      </p>
      <div className="action-row">
        <Link href="/restaurants/rest_demo" className="cta-secondary">
          Back to Common House
        </Link>
      </div>
    </SectionCard>
  );
}
