"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "phone" | "email" | "social";
type PhoneStep = "number" | "otp";

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [tab, setTab] = useState<Tab>("phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("number");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPhoneStep("otp");
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    onSuccess();
  }

  function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    onSuccess();
  }

  function handleSocial() {
    onSuccess();
  }

  return (
    <div className="bb-modal-backdrop" onClick={onClose}>
      <div className="bb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bb-modal__header">
          <h2 className="bb-modal__title">Quick Sign In</h2>
          <button className="bb-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="bb-modal__tabs">
          {(["phone", "email", "social"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`bb-modal__tab${tab === t ? " bb-modal__tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "phone" ? "Phone" : t === "email" ? "Email" : "Social"}
            </button>
          ))}
        </div>

        <div className="bb-modal__body">
          {tab === "phone" && (
            <>
              {phoneStep === "number" ? (
                <form onSubmit={handleSendCode} style={{ display: "grid", gap: 14 }}>
                  <div className="bb-modal__input-group">
                    <label className="bb-modal__label">Phone Number</label>
                    <input
                      className="bb-modal__input"
                      type="tel"
                      placeholder="+1 (416) 555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  <button type="submit" className="bb-modal__btn-gold">
                    Send Code
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerify} style={{ display: "grid", gap: 14 }}>
                  <div className="bb-modal__input-group">
                    <label className="bb-modal__label">Verification Code</label>
                    <div className="bb-otp-row">
                      <input
                        className="bb-modal__input"
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        autoComplete="one-time-code"
                      />
                      <button
                        type="button"
                        className="bb-modal__btn-primary"
                        style={{ padding: "12px 16px", width: "auto" }}
                        onClick={() => setPhoneStep("number")}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="bb-modal__btn-gold">
                    Verify
                  </button>
                </form>
              )}
            </>
          )}

          {tab === "email" && (
            <form onSubmit={handleEmailSignIn} style={{ display: "grid", gap: 14 }}>
              <div className="bb-modal__input-group">
                <label className="bb-modal__label">Email</label>
                <input
                  className="bb-modal__input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="bb-modal__input-group">
                <label className="bb-modal__label">Password</label>
                <input
                  className="bb-modal__input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="bb-modal__btn-primary">
                Sign In
              </button>
              <p className="bb-modal__link">
                No account?{" "}
                <Link href="/signup" onClick={onClose}>
                  Create one
                </Link>
              </p>
            </form>
          )}

          {tab === "social" && (
            <>
              <div className="bb-modal__social-row">
                <button className="bb-modal__social-btn" onClick={handleSocial}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
                <button className="bb-modal__social-btn" onClick={handleSocial}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                  </svg>
                  Apple
                </button>
              </div>
              <div className="bb-modal__divider">or continue with email</div>
              <button className="bb-modal__btn-primary" onClick={handleSocial}>
                Continue as Guest
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TapInSectionProps {
  restaurantId: string;
}

export function TapInSection({ restaurantId }: TapInSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  function handleSuccess() {
    setModalOpen(false);
    setSignedIn(true);
  }

  return (
    <>
      <div className="bb-tapin-card">
        <h2 className="bb-tapin-card__heading">Welcome to Black+Blue</h2>
        <p className="bb-tapin-card__sub">
          Tap in to view your table&rsquo;s bill and pay — no waiting for the check, no splitting headaches.
        </p>

        {signedIn ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="bb-signed-in-state">
              <span>Signed in as Guest</span>
            </div>
            <div className="bb-tapin-card__actions">
              <a href={`/tap/demo-table-12`} className="bb-btn-gold">
                View Your Bill &rarr;
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="bb-tapin-card__actions">
              <button className="bb-btn-gold" onClick={() => setModalOpen(true)}>
                Quick Sign In
              </button>
              <Link href="/session/pub_demo_table_10/order" className="bb-btn-outline">
                View Table Order &rarr;
              </Link>
            </div>
            <div style={{ marginTop: 8 }}>
              <Link
                href="/session/pub_demo_table_10/split"
                className="bb-btn-gold"
                style={{ width: "100%", justifyContent: "center" }}
              >
                💳 Pay Your Share
              </Link>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <LoginModal onClose={() => setModalOpen(false)} onSuccess={handleSuccess} />
      )}
    </>
  );
}
