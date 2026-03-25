import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountActions } from "../../components/account-actions";
import { RestaurantTopbar } from "../../components/restaurant-topbar";
import { SectionCard } from "../../components/section-card";
import { demoRestaurant } from "../../lib/demo-restaurant";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const mode = cookieStore.get("taps_demo_member_mode")?.value;
  if (mode !== "member") {
    redirect("/login");
  }

  const name = cookieStore.get("taps_demo_member_name")?.value ?? "Alex";
  const email = cookieStore.get("taps_demo_member_email")?.value ?? "alex@example.com";

  return (
    <main className="restaurant-shell">
      <div className="restaurant-page">
        <RestaurantTopbar restaurant={demoRestaurant} active="home" />

        <section className="auth-page-grid">
          <SectionCard eyebrow="Diner Account" title={`Welcome back, ${name}`}>
            <p className="restaurant-section-copy">
              This is the signed-in side of the customer experience: still restaurant-first, but with a clear place to return before you jump into a live table.
            </p>
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-row__label">Email</span>
                <span className="detail-row__value">{email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">Preferred restaurant</span>
                <span className="detail-row__value">{demoRestaurant.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">Tonight's shortcut</span>
                <span className="detail-row__value">Open live tab in one tap</span>
              </div>
            </div>
            <div className="cta-stack">
              <Link href="/tap/demo-table-12" className="cta-primary">
                Open table 12
              </Link>
              <Link href="/restaurants/rest_demo/menu" className="cta-secondary">
                Browse tonight's menu
              </Link>
              <AccountActions />
            </div>
          </SectionCard>

          <SectionCard eyebrow="Switch Modes" title="Move between customer and ops views">
            <p className="restaurant-section-copy">
              The product should let you move between the public restaurant site, diner account mode, live tableside mode, and restaurant ops without the experience feeling disconnected.
            </p>
            <div className="cta-stack">
              <Link href="/restaurants/rest_demo" className="cta-primary">
                Back to restaurant home
              </Link>
              <Link href="http://localhost:3001/login" className="cta-secondary">
                Open admin workspace
              </Link>
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
