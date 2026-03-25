import Link from "next/link";
import { DemoAdminLogin } from "../../components/demo-admin-login";
import { AdminShell } from "../../components/admin-shell";
import { OpsCard } from "../../components/ops-card";

export default function AdminLoginPage() {
  return (
    <AdminShell
      title="Admin Sign In"
      subtitle="Open the restaurant workspace, inspect every table, and manage the live session in demo mode."
    >
      <section className="admin-dual-grid">
        <OpsCard title="Demo admin login" eyebrow="Restaurant Ops">
          <div className="auth-phone-top">
            <div className="auth-phone-brand-row">
              <Link href="http://localhost:3000/restaurants/rest_demo" className="guest-inline-back" aria-label="Back to customer site">
                ←
              </Link>
              <span className="brand-chip brand-chip--dark">TAPS</span>
            </div>
            <div className="auth-segmented">
              <Link href="http://localhost:3000/login" className="auth-segmented__item">
                Guest
              </Link>
              <span className="auth-segmented__item auth-segmented__item--active">Admin</span>
            </div>
          </div>
          <p className="admin-note">
            This is the operations entry point for the demo. It unlocks tables, sessions, exceptions, and live order controls.
          </p>
          <DemoAdminLogin />
        </OpsCard>

        <OpsCard title="What you can do" eyebrow="Workspace">
          <div className="admin-detail-list">
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">Tables</span>
              <span className="admin-detail-row__value">See every active table</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">Session detail</span>
              <span className="admin-detail-row__value">Inspect bill, payers, and exceptions</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">Live edits</span>
              <span className="admin-detail-row__value">Add items, void lines, apply credits</span>
            </div>
          </div>
          <div className="admin-action-stack">
            <Link href="http://localhost:3000/restaurants/rest_demo" className="admin-nav__link">
              Back to customer website
            </Link>
          </div>
        </OpsCard>
      </section>
    </AdminShell>
  );
}
