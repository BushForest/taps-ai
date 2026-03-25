import Link from "next/link";
import { use } from "react";
import type { Route } from "next";

const SECTIONS = [
  {
    label: "Account",
    items: [
      { label: "Edit Profile", href: "edit" },
      { label: "Payment Methods", href: "payment-methods" },
      { label: "Notifications", href: "#" },
      { label: "Preferences", href: "preferences" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Help & FAQ", href: "#" },
      { label: "Contact Support", href: "#" },
      { label: "Rate the App", href: "#" },
    ],
  },
  {
    label: "Legal",
    items: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "About", href: "#" },
    ],
  },
];

export default function SettingsPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Settings</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="subprofile-body">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="subprofile-section-label">{section.label}</p>
            <div className="profile-menu">
              {section.items.map((item) => {
                const href = item.href.startsWith("#")
                  ? "#"
                  : `/session/${publicToken}/profile/${item.href}`;
                return (
                  <Link
                    key={item.label}
                    href={href as Route}
                    className="profile-menu-row"
                    style={{ textDecoration: "none" }}
                  >
                    <span className="profile-menu-row__label">{item.label}</span>
                    <span className="profile-menu-row__chevron">›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="profile-footer">
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
            TAPs v2.1.8 · Black+Blue Toronto
          </p>
          <button type="button" className="profile-signout-btn">Sign Out</button>
        </div>
      </div>
    </div>
  );
}
