import Link from "next/link";
import { DemoAuthForm } from "../../components/demo-auth-form";
import { SectionCard } from "../../components/section-card";
import { demoRestaurant } from "../../lib/demo-restaurant";

export default function SignupPage() {
  return (
    <main className="restaurant-shell">
      <div className="restaurant-page">
        <section className="auth-page-grid">
          <SectionCard eyebrow="Create Account" title="Save the diner side of the experience">
            <div className="auth-phone-top">
              <div className="auth-phone-brand-row">
                <Link href={`/restaurants/${demoRestaurant.id}`} className="guest-inline-back" aria-label="Back to restaurant">
                  ←
                </Link>
                <span className="brand-chip brand-chip--dark">TAPS</span>
              </div>
              <div className="auth-segmented">
                <span className="auth-segmented__item auth-segmented__item--active">Guest</span>
                <Link href="http://localhost:3001/login" className="auth-segmented__item">
                  Admin
                </Link>
              </div>
            </div>
            <p className="restaurant-section-copy">
              Member mode gives you a simple personal entry point into the restaurant site before you jump into a live table.
            </p>
            <DemoAuthForm mode="signup" />
            <p className="restaurant-note">
              Demo note: this creates a local diner profile for the product walkthrough, not a production auth account.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Already Seated?" title="You can still jump straight into the table">
            <p className="restaurant-section-copy">
              Accounts should help repeat diners, but they should never get in the way of one-tap tableside use.
            </p>
            <div className="cta-stack">
              <Link href="/tap/demo-table-12" className="cta-primary">
                Open table 12
              </Link>
              <Link href="/login" className="cta-secondary">
                I already have an account
              </Link>
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
