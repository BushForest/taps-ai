"use client";

import Image from "next/image";
import { useState } from "react";
import type { MenuSnapshot, MenuItem } from "@taps/contracts";
import { formatCurrency } from "../lib/format";

const ITEM_IMAGES: Record<string, string> = {
  // Steaks
  steak:    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  ribeye:   "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80",
  filet:    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
  surf:     "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
  salmon:   "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80",
  tuna:     "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80",
  chicken:  "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80",
  // Starters
  oysters:  "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=600&q=80",
  shrimp:   "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80",
  calamari: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  soup:     "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  salad:    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  mac:      "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80",
  brussels: "https://images.unsplash.com/photo-1574669437754-a1f2cb1eb9c3?w=600&q=80",
  marrow:   "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&q=80",
  // Cocktails
  cocktail:     "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80",
  oldfashioned: "https://images.unsplash.com/photo-1527761939622-933c0d84b9dc?w=600&q=80",
  wine:         "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80",
  beer:         "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80",
  whiskey:      "https://images.unsplash.com/photo-1527281400683-1aefee6bac16?w=600&q=80",
  // Desserts
  dessert:      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80",
  cake:         "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
  cheesecake:   "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
  creme:        "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80",
  sorbet:       "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80",
};

const CATEGORY_IMAGES: Record<string, string | null> = {
  steaks: ITEM_IMAGES.steak ?? null,
  starters: ITEM_IMAGES.oysters ?? null,
  cocktails: ITEM_IMAGES.cocktail ?? null,
  desserts: ITEM_IMAGES.dessert ?? null,
  seafood: ITEM_IMAGES.surf ?? null,
};

const ITEM_EMOJI: Record<string, string | null> = {
  steaks: "🥩",
  starters: "🦪",
  cocktails: "🍸",
  desserts: "🍮",
  seafood: "🦞",
  default: "🍽️",
};

function getCategoryKey(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_IMAGES)) {
    if (lower.includes(key)) return key;
  }
  return "default";
}

function getItemImage(itemName: string): string | null {
  const n = itemName.toLowerCase();
  if (n.includes("ribeye")) return ITEM_IMAGES.ribeye!;
  if (n.includes("filet") || n.includes("tenderloin")) return ITEM_IMAGES.filet!;
  if (n.includes("surf") || n.includes("lobster") || n.includes("turf")) return ITEM_IMAGES.surf!;
  if (n.includes("strip") || n.includes("sirloin") || n.includes("steak") || n.includes("bone-in")) return ITEM_IMAGES.steak!;
  if (n.includes("salmon")) return ITEM_IMAGES.salmon!;
  if (n.includes("tuna") || n.includes("ahi")) return ITEM_IMAGES.tuna!;
  if (n.includes("chicken")) return ITEM_IMAGES.chicken!;
  if (n.includes("oyster")) return ITEM_IMAGES.oysters!;
  if (n.includes("shrimp")) return ITEM_IMAGES.shrimp!;
  if (n.includes("calamari") || n.includes("squid")) return ITEM_IMAGES.calamari!;
  if (n.includes("onion soup") || n.includes("french onion")) return ITEM_IMAGES.soup!;
  if (n.includes("caesar") || n.includes("salad")) return ITEM_IMAGES.salad!;
  if (n.includes("mac") || n.includes("truffle")) return ITEM_IMAGES.mac!;
  if (n.includes("brussels") || n.includes("sprout")) return ITEM_IMAGES.brussels!;
  if (n.includes("marrow") || n.includes("bone")) return ITEM_IMAGES.marrow!;
  if (n.includes("old fashioned") || n.includes("negroni") || n.includes("manhattan")) return ITEM_IMAGES.oldfashioned!;
  if (n.includes("wine") || n.includes("spritz") || n.includes("aperol")) return ITEM_IMAGES.wine!;
  if (n.includes("beer") || n.includes("lager") || n.includes("ale") || n.includes("craft")) return ITEM_IMAGES.beer!;
  if (n.includes("whiskey") || n.includes("bourbon") || n.includes("scotch")) return ITEM_IMAGES.whiskey!;
  if (n.includes("martini") || n.includes("espresso") || n.includes("paloma") || n.includes("cocktail")) return ITEM_IMAGES.cocktail!;
  if (n.includes("cheesecake")) return ITEM_IMAGES.cheesecake!;
  if (n.includes("chocolate") || n.includes("lava") || n.includes("brownie")) return ITEM_IMAGES.cake!;
  if (n.includes("brûlée") || n.includes("creme") || n.includes("crème")) return ITEM_IMAGES.creme!;
  if (n.includes("sorbet") || n.includes("ice cream") || n.includes("gelato")) return ITEM_IMAGES.sorbet!;
  if (n.includes("cake") || n.includes("pastry") || n.includes("tart")) return ITEM_IMAGES.dessert!;
  return null;
}

function getItemAllergens(name: string): string[] {
  const n = name.toLowerCase();
  const allergens: string[] = [];
  if (n.includes("mac") || n.includes("truffle") || n.includes("bread") || n.includes("caesar") || n.includes("calamari") || n.includes("onion soup")) allergens.push("Gluten");
  if (n.includes("mac") || n.includes("truffle") || n.includes("cheesecake") || n.includes("brûlée") || n.includes("creme") || n.includes("chocolate") || n.includes("caesar")) allergens.push("Dairy");
  if (n.includes("oyster") || n.includes("shrimp") || n.includes("lobster") || n.includes("surf") || n.includes("calamari")) allergens.push("Shellfish");
  if (n.includes("cheesecake") || n.includes("chocolate") || n.includes("cake") || n.includes("caesar")) allergens.push("Eggs");
  return allergens;
}

interface ItemDetailModalProps {
  item: MenuItem;
  onClose: () => void;
}

function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const imgUrl = getItemImage(item.name);
  const allergens = getItemAllergens(item.name);
  const allAllergenTypes = ["Gluten", "Dairy", "Shellfish", "Nuts", "Eggs"];

  return (
    <div className="bb-item-modal-backdrop" onClick={onClose}>
      <div className="bb-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bb-item-modal__img-wrap">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={item.name}
              fill
              sizes="(max-width: 680px) 100vw, 520px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="bb-item-modal__img-placeholder">🍽️</div>
          )}
          <button className="bb-item-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="bb-item-modal__body">
          <div className="bb-item-modal__header">
            <h2 className="bb-item-modal__name">{item.name}</h2>
            <span className="bb-item-modal__price">{formatCurrency(item.basePriceCents)}</span>
          </div>
          {item.description ? (
            <p className="bb-item-modal__desc">{item.description}</p>
          ) : null}
          {item.availability === "sold_out" ? (
            <span className="bb-menu-card__badge" style={{ display: "inline-block", marginBottom: 8 }}>Sold out</span>
          ) : null}
          <div className="bb-item-modal__allergens">
            <p className="bb-item-modal__allergen-title">Allergen Information</p>
            <div className="bb-item-modal__allergen-list">
              {allAllergenTypes.map((a) => (
                <label key={a} className="bb-item-modal__allergen-row">
                  <input
                    type="checkbox"
                    readOnly
                    checked={allergens.includes(a)}
                    className="bb-item-modal__allergen-check"
                  />
                  <span className={allergens.includes(a) ? "bb-item-modal__allergen-label bb-item-modal__allergen-label--active" : "bb-item-modal__allergen-label"}>
                    Contains {a}
                  </span>
                </label>
              ))}
            </div>
            <p className="bb-item-modal__allergen-note">
              Please inform your server of any dietary restrictions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MenuPreviewProps {
  menu: MenuSnapshot;
}

export function MenuPreview({ menu }: MenuPreviewProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(
    menu.categories[0]?.id ?? null
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const visibleItems = activeCategory
    ? menu.items.filter((item) => item.categoryId === activeCategory && item.availability !== "hidden")
    : menu.items.filter((item) => item.availability !== "hidden");

  const activeCategory_ = menu.categories.find((c) => c.id === activeCategory);

  return (
    <>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 className="bb-section-heading">Tonight&rsquo;s Menu</h2>
          <p className="bb-section-sub">Curated selection from Black+Blue&rsquo;s kitchen</p>
        </div>

        <div className="bb-category-tabs" role="tablist">
          {menu.categories.map((cat) => {
            const key = getCategoryKey(cat.name);
            const emoji = (ITEM_EMOJI[key] ?? ITEM_EMOJI["default"]) ?? "🍽️";
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`bb-category-tab${activeCategory === cat.id ? " bb-category-tab--active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {emoji} {cat.name}
              </button>
            );
          })}
        </div>

        {visibleItems.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", padding: "20px 0" }}>
            No items available in this category right now.
          </p>
        ) : (
          <div className="bb-menu-grid">
            {visibleItems.map((item) => {
              const imgUrl = getItemImage(item.name);
              return (
                <article
                  key={item.id}
                  className="bb-menu-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedItem(item); }}
                >
                  <div className="bb-menu-card__img-wrap">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.name}
                        fill
                        sizes="(max-width: 480px) 45vw, 200px"
                        className="bb-menu-card__img"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="bb-menu-card__img-placeholder">
                        {(ITEM_EMOJI[getCategoryKey(activeCategory_?.name ?? "")] ?? ITEM_EMOJI["default"]) ?? "🍽️"}
                      </div>
                    )}
                  </div>
                  <div className="bb-menu-card__body">
                    <h3 className="bb-menu-card__name">{item.name}</h3>
                    {item.description ? (
                      <p className="bb-menu-card__desc">{item.description}</p>
                    ) : null}
                    <div className="bb-menu-card__footer">
                      <span className="bb-menu-card__price">{formatCurrency(item.basePriceCents)}</span>
                      {item.availability === "sold_out" ? (
                        <span className="bb-menu-card__badge">Sold out</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem ? (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}
    </>
  );
}
