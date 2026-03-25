"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
}

export default function SessionSignInPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const router = useRouter();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);

  function handleSignIn() {
    if (!email.trim()) return;
    setLoading(true);
    const name = email.includes("@") ? email.split("@")[0]! : email.trim();
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    writeCookie("taps_demo_member_mode", "member");
    writeCookie("taps_demo_member_name", displayName);
    writeCookie("taps_demo_member_email", email.includes("@") ? email.trim() : `${email.trim()}@taps.com`);
    router.push(`/session/${publicToken}/profile` as Route);
  }

  function handleSocial(provider: string) {
    writeCookie("taps_demo_member_mode", "member");
    writeCookie("taps_demo_member_name", provider + " User");
    writeCookie("taps_demo_member_email", `${provider.toLowerCase()}@taps.com`);
    router.push(`/session/${publicToken}/profile` as Route);
  }

  return (
    <div className="signin-page">
      <div className="signin-header">
        <Link href={`/session/${publicToken}/menu` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="signin-brand">Black+Blue Toronto</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="signin-hero">
        <h1 className="signin-welcome">Welcome</h1>
        <p className="signin-subtitle">Sign in to track orders &amp; earn rewards</p>
      </div>

      <div className="signin-body">
        <div className="signin-form-area">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="auth-label" htmlFor="signin-email">Email or username</label>
              <input
                id="signin-email"
                type="text"
                className="signin-input"
                placeholder="admin"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              />
            </div>
            <div>
              <label className="auth-label" htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                className="signin-input"
                placeholder="admin"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              />
            </div>
          </div>
          <button
            type="button"
            className="signin-btn-gold"
            disabled={loading || !email.trim()}
            onClick={handleSignIn}
            style={{ marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <div className="signin-divider">
          <span className="signin-divider__line" />
          <span className="signin-divider__text">or</span>
          <span className="signin-divider__line" />
        </div>

        <div className="signin-form-area">
          <div className="signin-social-row">
            <button type="button" className="signin-social-btn" onClick={() => handleSocial("Apple")}>
              <span style={{ fontSize: 17 }}>&#63743;</span> Apple
            </button>
            <button type="button" className="signin-social-btn" onClick={() => handleSocial("Google")}>
              <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 20H24v8h11.3C33.6 32.5 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 13 5 4 14 4 24s9 19 20 19c10 0 19-7 19-19 0-1.3-.1-2.7-.4-4z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5c-7.7 0-14.3 4.2-17.7 9.7z"/><path fill="#FBBC05" d="M24 43c5.2 0 9.7-1.7 13-4.7l-6-5c-1.9 1.3-4.3 2.1-7 2.1-5.2 0-9.5-3.5-11.1-8.2l-6.5 5C6 38.2 14.5 43 24 43z"/><path fill="#EA4335" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4-4.3 5.3l6 5c3.5-3.2 5.6-8 5.6-14.3 0-1.3-.1-2.7-.4-4z"/></svg>
              Google
            </button>
          </div>
        </div>

        <Link href={`/session/${publicToken}/menu` as Route} className="signin-guest-link">
          Continue as Guest →
        </Link>

        <p className="signin-footer">
          By continuing, you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}
