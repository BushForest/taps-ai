import Link from "next/link";
import type { DemoRestaurant } from "../lib/demo-restaurant";

export function RestaurantTopbar(props: {
  restaurant: DemoRestaurant;
  active: "home" | "menu";
}) {
  return (
    <header className="restaurant-topbar">
      <div className="restaurant-topbar__main">
        <Link href={`/restaurants/${props.restaurant.id}`} className="restaurant-brand-lockup">
          <span className="brand-chip">TAPS</span>
          <span className="restaurant-brand-lockup__copy">
            <span className="restaurant-brand-lockup__eyebrow">{props.restaurant.label}</span>
            <strong className="restaurant-brand-lockup__name">{props.restaurant.name}</strong>
          </span>
        </Link>
        <nav className="restaurant-topbar__nav" aria-label="Restaurant">
          <Link
            href={`/restaurants/${props.restaurant.id}`}
            className={
              props.active === "home" ? "restaurant-nav-link restaurant-nav-link--active" : "restaurant-nav-link"
            }
          >
            Home
          </Link>
          <Link
            href={`/restaurants/${props.restaurant.id}/menu`}
            className={
              props.active === "menu" ? "restaurant-nav-link restaurant-nav-link--active" : "restaurant-nav-link"
            }
          >
            Menu
          </Link>
          <Link href="/account" className="restaurant-nav-link">
            Account
          </Link>
          <Link href="/tap/demo-table-12" className="restaurant-nav-link restaurant-nav-link--cta">
            Open tab
          </Link>
        </nav>
      </div>
    </header>
  );
}
