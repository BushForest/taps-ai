import Image from "next/image";
import type { MenuSnapshot } from "@taps/contracts";
import { demoRestaurant } from "../lib/demo-restaurant";
import { TapInSection } from "./login-modal";
import { MenuPreview } from "./menu-preview";

const HERO_IMAGE = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80";
const INTERIOR_IMAGE = "https://images.unsplash.com/photo-1592861956120-e524fc739696?w=1200&q=80";

export function RestaurantHome(props: { menu: MenuSnapshot }) {
  return (
    <main className="bb-page">
      {/* ── Hero ──────────────────────────────────────── */}
      <div className="bb-hero">
        <Image
          src={HERO_IMAGE}
          alt="Black+Blue Toronto — upscale steakhouse dining room"
          fill
          sizes="100vw"
          priority
          className="bb-hero__img"
          style={{ objectFit: "cover" }}
        />
        <div className="bb-hero__overlay" />
        <div className="bb-hero__content">
          <h1 className="bb-hero__name">Black+Blue Toronto</h1>
          <div className="bb-hero__meta">
            <span className="bb-hero__tag">Steakhouse</span>
            <span className="bb-hero__tag">Canadian</span>
          </div>
          <p className="bb-hero__desc">
            An upscale urban steakhouse in the heart of downtown Toronto — aged prime beef,
            fresh seafood, and craft cocktails in an elegant setting.
          </p>
        </div>
      </div>

      {/* ── Info bar ──────────────────────────────────── */}
      <div className="bb-info-bar">
        <span>130 King St W, Toronto</span>
        <span className="bb-info-bar__dot">·</span>
        <span>Mon–Fri 11:30am–10pm</span>
        <span className="bb-info-bar__dot">·</span>
        <span>Sat–Sun 5pm–11pm</span>
        <span className="bb-info-bar__dot">·</span>
        <span>(416) 593-2583</span>
      </div>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="bb-body">

        {/* Tap-in / login card — client component */}
        <TapInSection restaurantId={demoRestaurant.id} />

        {/* Interior photo accent */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            height: 200,
            position: "relative",
          }}
        >
          <Image
            src={INTERIOR_IMAGE}
            alt="Black+Blue Toronto interior"
            fill
            sizes="(max-width: 680px) 100vw, 680px"
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, rgba(10,10,10,0.6) 0%, transparent 60%)",
              display: "flex",
              alignItems: "center",
              padding: "0 28px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  color: "var(--color-gold)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Est. 2005
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#fff",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  maxWidth: "24ch",
                }}
              >
                Where every cut tells a story
              </p>
            </div>
          </div>
        </div>

        {/* Menu preview — client component with category tabs */}
        <MenuPreview menu={props.menu} />
      </div>
    </main>
  );
}
