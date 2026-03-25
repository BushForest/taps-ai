import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthHeaderBtn } from "./auth-header-btn";

type NavKey = "menu" | "bill" | "pay" | "split" | "status";

interface NavTab {
  key: NavKey;
  label: string;
  href: Route;
}

export function SessionShell(props: {
  title?: string;
  subtitle?: string;
  publicToken?: string;
  activeNav?: NavKey;
  tableLabel?: string;
  children: ReactNode;
}) {
  const token = props.publicToken;

  const navTabs: NavTab[] = token
    ? [
        { key: "menu", label: "Menu",      href: `/session/${token}/menu` as Route },
        { key: "bill", label: "Live Bill", href: `/session/${token}/check` as Route },
        { key: "pay",  label: "Pay",       href: `/session/${token}/split` as Route },
      ]
    : [];

  const activeKey: NavKey =
    props.activeNav === "split" ? "pay" :
    props.activeNav === "status" ? "bill" :
    props.activeNav ?? "menu";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          {token && <AuthHeaderBtn token={token} />}
        </div>
        <div className="app-header__center">
          <span className="app-header__brand">Black+Blue Toronto</span>
          {props.tableLabel && (
            <span className="app-header__table">{props.tableLabel}</span>
          )}
        </div>
        <div className="app-header__right">
          {token && (
            <Link href={`/session/${token}/server` as Route} className="btn-server">
              Server
            </Link>
          )}
        </div>
      </header>

      {navTabs.length > 0 && (
        <div className="session-tab-bar">
          {navTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`session-tab${activeKey === tab.key ? " session-tab--active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      <main className="app-content">
        {props.children}
      </main>
    </div>
  );
}
