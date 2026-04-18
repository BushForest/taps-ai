"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { MenuSnapshot, MenuItem } from "@taps/contracts";
import { formatCurrency } from "../lib/format";
import { useCart } from "../hooks/use-cart";

/* ─── Image mapping ─────────────────────────────────────────── */
const ITEM_IMAGES: Record<string, string> = {
  steak:        "https://images.unsplash.com/photo-1652283305770-1bb6dc9972af?w=600&q=80",
  ribeye:       "https://images.unsplash.com/photo-1627852909832-84016efd80df?w=600&q=80",
  filet:        "https://images.unsplash.com/photo-1666632980177-6e1f0c0ec6a0?w=600&q=80",
  surf:         "https://images.unsplash.com/photo-1694345598429-00511c301452?w=600&q=80",
  salmon:       "https://images.unsplash.com/photo-1647482770207-06bfdc9458a9?w=600&q=80",
  tuna:         "https://images.unsplash.com/photo-1561553521-b6cddc085c5f?w=600&q=80",
  chicken:      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80",
  oysters:      "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=600&q=80",
  shrimp:       "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80",
  calamari:     "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  soup:         "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  salad:        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  mac:          "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80",
  brussels:     "https://images.unsplash.com/photo-1618160703612-d6b3c4ab8f29?w=600&q=80",
  marrow:       "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&q=80",
  cocktail:     "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80",
  oldfashioned: "https://images.unsplash.com/photo-1582271163294-2e906d884ad9?w=600&q=80",
  wine:         "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80",
  beer:         "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80",
  whiskey:      "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80",
  dessert:      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80",
  cake:         "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
  cheesecake:   "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
  creme:        "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80",
  sorbet:       "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80",
};

export function getItemImage(name: string): string | null {
  const n = name.toLowerCase();
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
  if (n.includes("beer") || n.includes("lager") || n.includes("ale")) return ITEM_IMAGES.beer!;
  if (n.includes("whiskey") || n.includes("bourbon") || n.includes("scotch")) return ITEM_IMAGES.whiskey!;
  if (n.includes("martini") || n.includes("espresso") || n.includes("paloma") || n.includes("cocktail")) return ITEM_IMAGES.cocktail!;
  if (n.includes("cheesecake")) return ITEM_IMAGES.cheesecake!;
  if (n.includes("chocolate") || n.includes("lava") || n.includes("brownie")) return ITEM_IMAGES.cake!;
  if (n.includes("brûlée") || n.includes("creme") || n.includes("crème")) return ITEM_IMAGES.creme!;
  if (n.includes("sorbet") || n.includes("ice cream") || n.includes("gelato")) return ITEM_IMAGES.sorbet!;
  if (n.includes("cake") || n.includes("pastry") || n.includes("tart")) return ITEM_IMAGES.dessert!;
  return null;
}

export function getAllergens(name: string): { code: string; label: string }[] {
  const n = name.toLowerCase();
  const out: { code: string; label: string }[] = [];
  const hasMeat = n.includes("steak") || n.includes("ribeye") || n.includes("filet") || n.includes("strip") || n.includes("sirloin") || n.includes("chicken") || n.includes("salmon") || n.includes("tuna") || n.includes("shrimp") || n.includes("lobster") || n.includes("oyster") || n.includes("calamari") || n.includes("bone-in") || n.includes("tenderloin") || n.includes("surf") || n.includes("turf");
  const hasDairy = n.includes("mac") || n.includes("truffle") || n.includes("cheesecake") || n.includes("brûlée") || n.includes("creme") || n.includes("crème") || n.includes("chocolate") || n.includes("caesar") || n.includes("butter");
  const hasGluten = n.includes("mac") || n.includes("truffle") || n.includes("bread") || n.includes("caesar") || n.includes("calamari") || n.includes("onion soup");
  const isVegan = !hasMeat && !hasDairy && (n.includes("sorbet") || n.includes("salad") || n.includes("brussels") || n.includes("mushroom") || n.includes("vegetable"));
  if (!hasGluten) out.push({ code: "gf", label: "GF" });
  if (isVegan) out.push({ code: "vegan", label: "VG" });
  if (n.includes("oyster") || n.includes("shrimp") || n.includes("lobster") || n.includes("surf") || n.includes("calamari")) out.push({ code: "sf", label: "SF" });
  return out;
}

export function getIncludedSide(name: string): string | null {
  const n = name.toLowerCase();
  const isSteak_ = n.includes("ribeye") || n.includes("filet") || n.includes("strip") || n.includes("sirloin") || n.includes("bone-in") || n.includes("tenderloin") || n.includes("surf & turf") || n.includes("surf and turf");
  const isMain = n.includes("salmon") || n.includes("tuna") || n.includes("chicken") || n.includes("steak");
  if (isSteak_) return "Choice of 1 side";
  if (isMain) return "Includes 1 side";
  return null;
}

function isSteak(name: string) {
  const n = name.toLowerCase();
  const isBeef = n.includes("ribeye") || n.includes("filet") || n.includes("strip") ||
                 n.includes("sirloin") || n.includes("bone-in") || n.includes("tenderloin");
  const isPoultryOrFish = n.includes("salmon") || n.includes("tuna") || n.includes("chicken");
  return isBeef && !isPoultryOrFish;
}

const DONENESS = ["Medium Rare", "Rare", "Medium", "Well Done"];
const SAUCES = ["Béarnaise", "Peppercorn", "Chimichurri"];
const SIDES = ["Mac & Cheese", "Caesar Salad", "Brussels Sprouts", "Truffle Fries"];

/* ─── Menu Browser ──────────────────────────────────────────── */
interface MenuBrowserProps {
  menu: MenuSnapshot;
  publicToken: string;
}

export function MenuBrowser({ menu, publicToken }: MenuBrowserProps) {
  const { items: cartItems, cartCount, addItem } = useCart();
  const router = useRouter();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Inline expansion state
  const [expandDoneness, setExpandDoneness] = useState<string | undefined>(undefined);
  const [expandSauce, setExpandSauce] = useState<string | undefined>(undefined);
  const [expandSide, setExpandSide] = useState<string | undefined>(undefined);
  const [expandNotes, setExpandNotes] = useState("");
  const [expandQty, setExpandQty] = useState(1);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`menu-item-${scrollToId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setScrollToId(null);
  }, [scrollToId]);

  useEffect(() => {
    const savedId = sessionStorage.getItem("menu_expanded_item");
    if (!savedId) return;
    const item = menu.items.find((i) => i.id === savedId);
    if (item && item.availability !== "sold_out") openItem(item);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCategories: { id: string | null; name: string; items: typeof menu.items }[] = activeCategoryId
    ? [{ id: activeCategoryId, name: menu.categories.find((c) => c.id === activeCategoryId)?.name ?? "", items: menu.items.filter((i) => i.categoryId === activeCategoryId && i.availability !== "hidden") }]
    : menu.categories.map((cat) => ({ id: cat.id, name: cat.name, items: menu.items.filter((i) => i.categoryId === cat.id && i.availability !== "hidden") })).filter((g) => g.items.length > 0);

  const cartQtyMap: Record<string, number> = {};
  for (const ci of cartItems) {
    cartQtyMap[ci.id] = (cartQtyMap[ci.id] ?? 0) + ci.quantity;
  }

  function openItem(item: MenuItem) {
    const showD = isSteak(item.name);
    sessionStorage.setItem("menu_expanded_item", item.id);
    setSelectedItem(item);
    setExpandDoneness(showD ? "Medium Rare" : undefined);
    setExpandSauce(showD ? "Béarnaise" : undefined);
    setExpandSide(undefined);
    setExpandNotes("");
    setExpandQty(1);
  }

  function closeItem() {
    sessionStorage.removeItem("menu_expanded_item");
    setSelectedItem(null);
  }

  function handleAddItem(item: MenuItem, opts: { doneness?: string; sauce?: string; side?: string; notes?: string; qty: number }) {
    addItem({
      id: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      quantity: opts.qty,
      options: {
        doneness: opts.doneness,
        sauce: opts.sauce,
        side: opts.side,
        notes: opts.notes,
      },
    });
  }

  function handleExpandAdd(item: MenuItem) {
    handleAddItem(item, {
      doneness: expandDoneness,
      sauce: expandSauce,
      side: expandSide,
      notes: expandNotes.trim() || undefined,
      qty: expandQty,
    });
    closeItem();
  }

  function pickForMe() {
    const available = menu.items.filter((i) => i.availability !== "hidden" && i.availability !== "sold_out");
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)]!;
    setActiveCategoryId(null);
    openItem(pick);
    setScrollToId(pick.id);
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Category pills */}
        <div className="bb-category-tabs-row">
          <div className="bb-category-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeCategoryId === null}
              className={`bb-category-tab${activeCategoryId === null ? " bb-category-tab--active" : ""}`}
              onClick={() => setActiveCategoryId(null)}
            >
              Full Menu
            </button>
            {menu.categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategoryId === cat.id}
                className={`bb-category-tab${activeCategoryId === cat.id ? " bb-category-tab--active" : ""}`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item list */}
        {visibleCategories.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", padding: "20px 0" }}>
            No items available in this category right now.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visibleCategories.map((group) => (
              <div key={group.id ?? "all"}>
                <h2 className="menu-category-heading">{group.name}</h2>
                <div className="menu-list">
                {group.items.map((item) => {
              const imgUrl = getItemImage(item.name);
              const soldOut = item.availability === "sold_out";
              const allergens = getAllergens(item.name);
              const side = getIncludedSide(item.name);
              const cartQty = cartQtyMap[item.id] ?? 0;
              const inCart = cartQty > 0;
              const isExpanded = selectedItem?.id === item.id;
              const showDoneness = isSteak(item.name);

              return (
                <article
                  key={item.id}
                  id={`menu-item-${item.id}`}
                  className={`menu-list-card${inCart ? " menu-list-card--in-cart" : ""}${soldOut ? " menu-list-card--sold-out" : ""}${isExpanded ? " menu-list-card--expanded" : ""}`}
                  role={isExpanded ? undefined : "button"}
                  tabIndex={soldOut ? -1 : 0}
                  onClick={() => {
                    if (soldOut) return;
                    if (isExpanded) closeItem();
                    else openItem(item);
                  }}
                  onKeyDown={(e) => {
                    if (!soldOut && !isExpanded && (e.key === "Enter" || e.key === " ")) openItem(item);
                  }}
                >
                  {/* Top row */}
                  <div className="menu-list-card__top-row">
                    <div className="menu-list-card__thumb">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={item.name}
                          fill
                          sizes="110px"
                          className="menu-list-card__thumb-img"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div className="menu-list-card__thumb-placeholder">🍽️</div>
                      )}
                    </div>

                    <div className="menu-list-card__info">
                      <h3 className="menu-list-card__name">{item.name}</h3>
                      {item.description ? (
                        <p className="menu-list-card__desc">{item.description}</p>
                      ) : null}
                      <div className="menu-list-card__bottom-row">
                        <div className="menu-list-card__chips">
                          {allergens.map((a) => (
                            <span key={a.code} className={`menu-chip menu-chip--${a.code}`} title={a.code === "gf" ? "Gluten Free" : a.code === "vegan" ? "Vegan" : "Contains Shellfish"}>{a.label}</span>
                          ))}
                          {side ? <span className="menu-chip menu-chip--side" title={side}>+ side</span> : null}
                          {soldOut ? <span className="menu-chip menu-chip--sold-out">Sold out</span> : null}
                        </div>
                        <div className="menu-list-card__price-group">
                          <span className="menu-list-card__price">{formatCurrency(item.basePriceCents)}</span>
                          {inCart ? (
                            <span className="menu-list-card__cart-badge">{cartQty}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline expansion */}
                  {isExpanded && item.availability !== "sold_out" ? (
                    <div
                      className="menu-item-expand"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.description ? (
                        <p className="menu-item-expand__desc">{item.description}</p>
                      ) : null}

                      {showDoneness ? (
                        <>
                          <div>
                            <p className="option-label">Doneness</p>
                            <div className="option-pills">
                              {DONENESS.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  className={`option-pill${expandDoneness === d ? " option-pill--active" : ""}`}
                                  onClick={() => setExpandDoneness(d)}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="option-label">Sauce</p>
                            <div className="option-pills">
                              {SAUCES.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={`option-pill${expandSauce === s ? " option-pill--active" : ""}`}
                                  onClick={() => setExpandSauce(s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}

                      {getIncludedSide(item.name) !== null ? (
                        <div>
                          <p className="option-label">Side Dish</p>
                          <div className="option-pills">
                            {SIDES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={`option-pill${expandSide === s ? " option-pill--active" : ""}`}
                                onClick={() => setExpandSide(expandSide === s ? undefined : s)}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <p className="option-label">Notes</p>
                        <textarea
                          className="notes-textarea"
                          placeholder="Any special requests..."
                          value={expandNotes}
                          onChange={(e) => setExpandNotes(e.target.value)}
                          rows={2}
                        />
                      </div>

                      {/* Qty row + Add */}
                      <div className="expand-qty-add-row">
                        <div className="expand-qty-row">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setExpandQty(Math.max(1, expandQty - 1))}
                            disabled={expandQty <= 1}
                          >−</button>
                          <span className="qty-value">{expandQty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setExpandQty(expandQty + 1)}
                          >+</button>
                        </div>
                        <button
                          type="button"
                          className="expand-add-btn"
                          onClick={() => handleExpandAdd(item)}
                        >
                          Add · {formatCurrency(item.basePriceCents * expandQty)}
                        </button>
                      </div>

                      <p className="expand-confirm-text">
                        You&apos;ll confirm before it goes to the kitchen
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Surprise Me FAB */}
      <button
        type="button"
        className="pick-for-me-btn"
        onClick={pickForMe}
        title="Pick something for me"
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>Surprise Me</span>
      </button>

      {/* Send to Kitchen bar */}
      {cartCount > 0 ? (
        <div className="kitchen-bar">
          <button
            type="button"
            className="kitchen-bar__cta"
            onClick={() => router.push(`/session/${publicToken}/kitchen-confirm` as Route)}
          >
            🔥 Send to Kitchen ({cartCount})
          </button>
        </div>
      ) : null}
    </>
  );
}
