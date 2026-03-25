import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="signin-page">
      {/* Header */}
      <div className="signin-header">
        <Link href="/" className="signin-back-btn" aria-label="Back">
          ‹
        </Link>
        <span className="signin-brand">Black+Blue Toronto</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="signin-body">
        <h1 className="signin-welcome">Welcome</h1>
        <p className="signin-subtitle">Sign in to get your receipt emailed</p>

        {/* Email / phone */}
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="auth-label" htmlFor="email">Email or Phone</label>
            <input
              id="email"
              type="text"
              className="input"
              placeholder="your@email.com"
              autoComplete="username"
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="auth-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <button type="button" className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)" }}>
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="button" className="bb-btn-gold" style={{ marginTop: 8 }}>
          Sign In
        </button>

        {/* Fast Checkout */}
        <p className="signin-fast-checkout-label">Fast Checkout</p>
        <div className="signin-phone-row">
          <input
            type="tel"
            className="input"
            placeholder="+1 (416) 555-0123"
            autoComplete="tel"
          />
          <button type="button" className="btn-outline" style={{ width: "auto", whiteSpace: "nowrap", padding: "0 16px" }}>
            Send Code
          </button>
        </div>

        {/* Social */}
        <div className="signin-social-row">
          <button type="button" className="signin-social-btn">Apple</button>
          <button type="button" className="signin-social-btn">Google</button>
          <button type="button" className="signin-social-btn">Phone</button>
        </div>

        {/* Continue as guest */}
        <Link href="/tap/demo-table-12" className="signin-guest-link">
          Continue as Guest →
        </Link>

        <p className="signin-footer">
          By signing in, you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}
