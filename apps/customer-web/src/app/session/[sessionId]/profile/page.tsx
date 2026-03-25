"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Route } from "next";

const MENU_ITEMS = [
  { icon: "👤", label: "Edit Profile",      href: "edit" },
  { icon: "💳", label: "Payment Methods",   href: "payment-methods" },
  { icon: "📋", label: "Order History",     href: "order-history" },
  { icon: "🍽", label: "Preferences",       href: "preferences" },
  { icon: "⚙",  label: "Settings",          href: "settings" },
  { icon: "🔔", label: "Notifications",     href: "preferences" },
];

function getCookie(name: string) {
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1];
}

export default function ProfilePage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@email.com");

  useEffect(() => {
    const storedName = getCookie("taps_demo_member_name");
    const storedEmail = getCookie("taps_demo_member_email");
    if (storedName) setName(decodeURIComponent(storedName));
    if (storedEmail) setEmail(decodeURIComponent(storedEmail));
  }, []);

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleSignOut() {
    document.cookie = "taps_demo_member_mode=; path=/; max-age=0";
    document.cookie = "taps_demo_member_name=; path=/; max-age=0";
    document.cookie = "taps_demo_member_email=; path=/; max-age=0";
    window.location.href = `/session/${publicToken}/menu`;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Link href={`/session/${publicToken}/menu` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="profile-header__title">Profile</span>
        <Link href={`/session/${publicToken}/profile/settings` as Route} className="profile-gear-btn" aria-label="Settings">⚙</Link>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <h2 className="profile-name">{name}</h2>
        <p className="profile-email">{email}</p>
        <span className="profile-badge">⭐ Gold Member</span>
      </div>

      <div className="profile-menu">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={`/session/${publicToken}/profile/${item.href}` as Route}
            className="profile-menu-row"
          >
            <span className="profile-menu-row__left">
              <span className="profile-menu-row__icon">{item.icon}</span>
              <span className="profile-menu-row__label">{item.label}</span>
            </span>
            <span className="profile-menu-row__chevron">›</span>
          </Link>
        ))}
      </div>

      <div className="profile-footer">
        <button type="button" className="profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  );
}
