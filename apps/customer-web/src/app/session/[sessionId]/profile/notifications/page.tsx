import Link from "next/link";
import { use } from "react";
import type { Route } from "next";

export default function NotificationsPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Notifications</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="subprofile-body">
        <p className="subprofile-section-label">Notification Preferences</p>
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 32 }}>
          Notification preferences coming soon.
        </p>
      </div>
    </div>
  );
}
