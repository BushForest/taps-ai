import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicMenuSections } from "../../../../components/public-menu-sections";
import { RestaurantTopbar } from "../../../../components/restaurant-topbar";
import { SectionCard } from "../../../../components/section-card";
import { fetchPublicRestaurantMenu } from "../../../../lib/api-client";
import { getDemoRestaurantById } from "../../../../lib/demo-restaurant";

export default async function RestaurantMenuPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const restaurant = getDemoRestaurantById(restaurantId);

  if (!restaurant) {
    notFound();
  }

  const menu = await fetchPublicRestaurantMenu(restaurantId);

  return (
    <main className="restaurant-shell">
      <div className="restaurant-page">
        <RestaurantTopbar restaurant={restaurant} active="menu" />

        <section className="restaurant-hero-card">
          <div className="restaurant-hero-grid">
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <p className="restaurant-kicker">{restaurant.label}</p>
                <h1 className="restaurant-headline">Dinner & drinks</h1>
                <p className="restaurant-summary">
                  Browse the full menu before you sit down, keep it nearby while you order another round, and open the live tab once the table is ready to settle.
                </p>
              </div>
              <div className="restaurant-meta-strip">
                {menu.categories.map((category) => (
                  <a key={category.id} href={`#menu-${category.id}`} className="restaurant-meta-chip restaurant-meta-chip--link">
                    {category.name}
                  </a>
                ))}
              </div>
              <div className="restaurant-hero-actions">
                <Link href="/tap/demo-table-12" className="cta-primary">
                  Open table 12 live bill
                </Link>
                <Link href={`/restaurants/${restaurant.id}`} className="cta-secondary">
                  Back to restaurant home
                </Link>
              </div>
            </div>

            <SectionCard eyebrow="On the House" title={restaurant.tagline}>
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-row__label">Menu source</span>
                  <span className="detail-row__value">{menu.source}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Version</span>
                  <span className="detail-row__value">{menu.sourceVersion}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Categories tonight</span>
                  <span className="detail-row__value">{menu.categories.length}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Best way in</span>
                  <span className="detail-row__value">Browse first, tap when seated</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>

        <PublicMenuSections menu={menu} />
      </div>
    </main>
  );
}
