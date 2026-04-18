"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSignOut() {
    document.cookie = "taps_demo_member_mode=; path=/; max-age=0";
    document.cookie = "taps_demo_member_name=; path=/; max-age=0";
    document.cookie = "taps_demo_member_email=; path=/; max-age=0";
    router.push(`/session/${publicToken}/menu` as Route);
  }

  return (
    <div className="subprofile-page">
      {toast && <div className="st-toast">{toast}</div>}
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
                if (item.href === "#") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className="profile-menu-row"
                      onClick={() => showToast("Coming soon")}
                      style={{ textDecoration: "none", background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
                    >
                      <span className="profile-menu-row__label">{item.label}</span>
                      <span className="profile-menu-row__chevron">›</span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={`/session/${publicToken}/profile/${item.href}` as Route}
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
          <button type="button" className="profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
