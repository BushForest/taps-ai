import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";

type AdminTab = "floor" | "sessions" | "exceptions" | "analytics";

const TABS: { key: AdminTab; label: string; icon: string; path: string }[] = [
  { key: "floor",      label: "Floor",      icon: "⊞", path: "" },
  { key: "sessions",   label: "Sessions",   icon: "☰", path: "/sessions" },
  { key: "exceptions", label: "Exceptions", icon: "△", path: "/exceptions" },
  { key: "analytics",  label: "Analytics",  icon: "⬡", path: "/analytics" },
];

export function AdminShell(props: {
  children: ReactNode;
  restaurantId?: string;
  activeTab?: AdminTab;
  title?: string;
  subtitle?: string;
}) {
  const rid = props.restaurantId ?? "rest_demo";

  return (
    <div className="admin-app">
      <header className="admin-app-header">
        <span className="admin-app-brand">Black+Blue Toronto</span>
        <span className="admin-app-badge">Admin</span>
      </header>

      {/* Desktop sidebar — hidden on mobile via CSS */}
      <nav className="admin-sidebar" aria-label="Main navigation">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/restaurants/${rid}${tab.path}` as Route}
            className={`admin-sidebar-link${props.activeTab === tab.key ? " admin-sidebar-link--active" : ""}`}
          >
            <span className="admin-sidebar-link__icon">{tab.icon}</span>
            <span className="admin-sidebar-link__label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      <main className="admin-main">
        {props.children}
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <nav className="admin-bottom-nav" aria-label="Navigation">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/restaurants/${rid}${tab.path}` as Route}
            className={`admin-bottom-tab${props.activeTab === tab.key ? " admin-bottom-tab--active" : ""}`}
          >
            <span className="admin-bottom-tab__icon">{tab.icon}</span>
            <span className="admin-bottom-tab__label">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
