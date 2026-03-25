"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import type { GetSessionStatusResponse, MenuSnapshot, MenuItem } from "@taps/contracts";
import type { GetCheckResponse } from "@taps/contracts";
import { formatCurrency, rootPayableLines, childLines, displayTableLabel } from "../lib/format";
import { SplitFlow } from "./split-flow";

// ─── Image map (copied from menu-preview.tsx to avoid circular deps) ───────────

const ITEM_IMAGES: Record<string, string> = {
  steak:        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  ribeye:       "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80",
  filet:        "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
  surf:         "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80",
  salmon:       "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80",
  tuna:         "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80",
  chicken:      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80",
  oysters:      "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=600&q=80",
  shrimp:       "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80",
  calamari:     "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  soup:         "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  salad:        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  mac:          "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80",
  brussels:     "https://images.unsplash.com/photo-1574669437754-a1f2cb1eb9c3?w=600&q=80",
  marrow:       "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&q=80",
  cocktail:     "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80",
  oldfashioned: "https://images.unsplash.com/photo-1527761939622-933c0d84b9dc?w=600&q=80",
  wine:         "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80",
  beer:         "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80",
  whiskey:      "https://images.unsplash.com/photo-1527281400683-1aefee6bac16?w=600&q=80",
  dessert:      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80",
  cake:         "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
  cheesecake:   "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
  creme:        "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80",
  sorbet:       "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80",
};

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
  if (n.includes("br\u00fbl\u00e9e") || n.includes("creme") || n.includes("cr\u00e8me")) return ITEM_IMAGES.creme!;
  if (n.includes("sorbet") || n.includes("ice cream") || n.includes("gelato")) return ITEM_IMAGES.sorbet!;
  if (n.includes("cake") || n.includes("pastry") || n.includes("tart")) return ITEM_IMAGES.dessert!;
  return null;
}

function getItemAllergens(name: string): string[] {
  const n = name.toLowerCase();
  const allergens: string[] = [];
  if (n.includes("mac") || n.includes("truffle") || n.includes("bread") || n.includes("caesar") || n.includes("calamari") || n.includes("onion soup")) allergens.push("Gluten");
  if (n.includes("mac") || n.includes("truffle") || n.includes("cheesecake") || n.includes("br\u00fbl\u00e9e") || n.includes("creme") || n.includes("chocolate") || n.includes("caesar")) allergens.push("Dairy");
  if (n.includes("oyster") || n.includes("shrimp") || n.includes("lobster") || n.includes("surf") || n.includes("calamari")) allergens.push("Shellfish");
  if (n.includes("cheesecake") || n.includes("chocolate") || n.includes("cake") || n.includes("caesar")) allergens.push("Eggs");
  return allergens;
}

// ─── Item customization options ───────────────────────────────────────────────

function getItemOptions(itemName: string, categoryName: string): { label: string; choices: string[] }[] {
  const opts: { label: string; choices: string[] }[] = [];
  const n = itemName.toLowerCase();
  const c = categoryName.toLowerCase();

  if (c.includes("steak") || c.includes("main") || n.includes("steak") || n.includes("ribeye") ||
      n.includes("filet") || n.includes("strip") || n.includes("sirloin") || n.includes("bone-in") ||
      n.includes("surf") || n.includes("chicken") || n.includes("salmon") || n.includes("tuna")) {
    opts.push({ label: "Doneness", choices: ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"] });
  }

  if (c.includes("steak") || c.includes("main") || n.includes("steak") || n.includes("chicken")) {
    opts.push({ label: "Sauce", choices: ["House Peppercorn", "B\u00e9arnaise", "Red Wine Jus", "No Sauce"] });
  }

  if (n.includes("soup")) {
    opts.push({ label: "Temperature", choices: ["Hot", "Extra Hot"] });
  }

  opts.push({ label: "Preferences", choices: ["No Added Salt", "Extra Sauce on Side", "Allergen Alert \u2014 Tell Server", "No Modifications"] });

  return opts;
}

function getItemOptionDefaults(opts: { label: string; choices: string[] }[]): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const opt of opts) {
    if (opt.label === "Doneness") defaults[opt.label] = "Medium Rare";
    else if (opt.label === "Sauce") defaults[opt.label] = "House Peppercorn";
  }
  return defaults;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingItem {
  id: string;
  name: string;
  price: number;
  options: string[];
  status: "pending" | "in_kitchen";
}

type Tab = "menu" | "livebill" | "split" | "status";

export interface SessionTabsPageProps {
  publicToken: string;
  summary: GetSessionStatusResponse;
  checkResponse: GetCheckResponse | null;
  menu: MenuSnapshot | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SessionTabsPage({ publicToken, summary, checkResponse, menu }: SessionTabsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [signedIn, setSignedIn] = useState(false);
  const [signedInAs, setSignedInAs] = useState("");
  const [loginPanelOpen, setLoginPanelOpen] = useState(false);

  // Init from cookies (persists across page nav)
  useEffect(() => {
    const getCookie = (name: string) => document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1];
    const mode = getCookie("taps_demo_member_mode");
    if (mode === "member") {
      const name = decodeURIComponent(getCookie("taps_demo_member_name") ?? "");
      setSignedIn(true);
      setSignedInAs(name || "Member");
    }
  }, []);
  const [pendingKitchenItems, setPendingKitchenItems] = useState<PendingItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedPrefs, setSelectedPrefs] = useState<Record<string, Set<string>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  const snapshot = checkResponse?.snapshot ?? null;
  const kitchenCount = pendingKitchenItems.filter((i) => i.status === "in_kitchen").length;

  const tableLabel = displayTableLabel(summary.session?.tableId ?? summary.access?.tableId);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSendToKitchen = useCallback((item: PendingItem) => {
    setPendingKitchenItems((prev) =>
      prev.map((i) => i.id === item.id ? { ...i, status: "in_kitchen" } : i)
    );
    setAddedItemId(null);
    setExpandedItemId(null);
    showToast("Sent to kitchen");
  }, [showToast]);

  const handleAddToOrder = useCallback((item: MenuItem, categoryName: string) => {
    const itemOpts = getItemOptions(item.name, categoryName);
    const chosenOptions: string[] = [];

    for (const opt of itemOpts) {
      if (opt.label === "Preferences") {
        const prefs = selectedPrefs[item.id];
        if (prefs && prefs.size > 0) {
          chosenOptions.push(...Array.from(prefs));
        }
      } else {
        const key = `${item.id}_${opt.label}`;
        const val = selectedOptions[key] ?? getItemOptionDefaults(itemOpts)[opt.label];
        if (val) chosenOptions.push(val);
      }
    }

    const pending: PendingItem = {
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      price: item.basePriceCents,
      options: chosenOptions,
      status: "pending",
    };

    setPendingKitchenItems((prev) => [...prev, pending]);
    setAddedItemId(pending.id);
  }, [selectedOptions, selectedPrefs]);

  return (
    <div className="st-shell">
      {toast && <div className="st-toast">{toast}</div>}

      <Header
        publicToken={publicToken}
        tableLabel={tableLabel}
        signedIn={signedIn}
        signedInAs={signedInAs}
        loginPanelOpen={loginPanelOpen}
        onToggleLogin={() => setLoginPanelOpen((v) => !v)}
      />

      {loginPanelOpen && (
        <LoginPanel
          onSignIn={(name, email) => {
            const displayName = name || "Member";
            const writeCookie = (k: string, v: string) => {
              document.cookie = `${k}=${encodeURIComponent(v)}; path=/; max-age=2592000; SameSite=Lax`;
            };
            writeCookie("taps_demo_member_mode", "member");
            writeCookie("taps_demo_member_name", displayName);
            writeCookie("taps_demo_member_email", email || displayName + "@taps.com");
            setSignedIn(true);
            setSignedInAs(displayName);
            setLoginPanelOpen(false);
          }}
          onGuest={() => {
            setSignedIn(true);
            setSignedInAs("Guest");
            setLoginPanelOpen(false);
          }}
        />
      )}

      <TabBar
        activeTab={activeTab}
        kitchenCount={kitchenCount}
        onTabChange={setActiveTab}
      />

      <div className="st-content">
        {activeTab === "menu" && (
          <MenuTab
            menu={menu}
            expandedItemId={expandedItemId}
            selectedOptions={selectedOptions}
            selectedPrefs={selectedPrefs}
            addedItemId={addedItemId}
            pendingKitchenItems={pendingKitchenItems}
            onExpand={(id) => {
              setExpandedItemId((prev) => prev === id ? null : id);
              setAddedItemId(null);
            }}
            onOptionChange={(key, val) => setSelectedOptions((prev) => ({ ...prev, [key]: val }))}
            onPrefToggle={(itemId, pref) => {
              setSelectedPrefs((prev) => {
                const set = new Set(prev[itemId] ?? []);
                if (set.has(pref)) set.delete(pref); else set.add(pref);
                return { ...prev, [itemId]: set };
              });
            }}
            onAddToOrder={handleAddToOrder}
            onSendToKitchen={handleSendToKitchen}
          />
        )}
        {activeTab === "livebill" && (
          <LiveBillTab
            snapshot={snapshot}
            pendingKitchenItems={pendingKitchenItems}
            onPayShare={() => setActiveTab("split")}
          />
        )}
        {activeTab === "split" && (
          <SplitTab publicToken={publicToken} summary={summary} />
        )}
        {activeTab === "status" && (
          <StatusTab summary={summary} publicToken={publicToken} />
        )}
      </div>

      <RequestServerButton publicToken={publicToken} />

      <BottomTabBar
        activeTab={activeTab}
        kitchenCount={kitchenCount}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header(props: {
  publicToken: string;
  tableLabel: string;
  signedIn: boolean;
  signedInAs: string;
  loginPanelOpen: boolean;
  onToggleLogin: () => void;
}) {
  return (
    <header className="st-header">
      <div className="st-header-top">
        <span className="st-header-brand">BLACK+BLUE TORONTO</span>
        <div className="st-header-actions">
          {props.signedIn ? (
            <Link
              href={`/session/${props.publicToken}/profile` as import("next").Route}
              className="st-header-signin st-header-signin--profile"
            >
              <span className="st-header-avatar">{props.signedInAs[0]?.toUpperCase()}</span>
              <span>{props.signedInAs}</span>
            </Link>
          ) : (
            <button className="st-header-signin" onClick={props.onToggleLogin}>
              Sign In
            </button>
          )}
        </div>
      </div>
      <div className="st-header-context">
        <span className="st-header-table">{props.tableLabel}</span>
        <span className="st-header-dot">·</span>
        <span className="st-header-meta">Live tab</span>
      </div>
    </header>
  );
}

// ─── Login Panel ──────────────────────────────────────────────────────────────

function LoginPanel(props: {
  onSignIn: (name: string, email: string) => void;
  onGuest: () => void;
}) {
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");

  function handleSignIn() {
    const name = email.trim().split("@")[0] ?? email.trim();
    props.onSignIn(name, email.trim());
  }

  return (
    <div className="st-login-panel">
      <p className="st-login-title">Sign in to your account</p>
      <div className="st-login-fields">
        <input
          className="st-login-input"
          placeholder="Email or username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          className="st-login-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
        />
      </div>
      <div className="st-login-btns">
        <button className="st-login-submit" onClick={handleSignIn}>
          Sign In
        </button>
        <button className="st-login-guest" onClick={props.onGuest}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

// ─── Tab Bar (top) ────────────────────────────────────────────────────────────

function TabBar(props: {
  activeTab: Tab;
  kitchenCount: number;
  onTabChange: (tab: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "menu", label: "Menu" },
    { key: "livebill", label: "Live Bill" },
    { key: "split", label: "Split" },
    { key: "status", label: "Status" },
  ];

  return (
    <nav className="st-tabs" aria-label="Session navigation">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`st-tab${props.activeTab === tab.key ? " st-tab--active" : ""}`}
          onClick={() => props.onTabChange(tab.key)}
          aria-current={props.activeTab === tab.key ? "page" : undefined}
        >
          {tab.label}
          {tab.key === "livebill" && props.kitchenCount > 0 && (
            <span className="st-tab-badge">{props.kitchenCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

function BottomTabBar(props: {
  activeTab: Tab;
  kitchenCount: number;
  onTabChange: (tab: Tab) => void;
}) {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "menu", label: "Menu", icon: "🍽" },
    { key: "livebill", label: "Live Bill", icon: "🧾" },
    { key: "split", label: "Split", icon: "💳" },
    { key: "status", label: "Status", icon: "📊" },
  ];

  return (
    <nav className="st-bottom-nav" aria-label="Bottom navigation">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`st-bottom-tab${props.activeTab === tab.key ? " st-bottom-tab--active" : ""}`}
          onClick={() => props.onTabChange(tab.key)}
        >
          <span className="st-bottom-tab__icon">
            {tab.icon}
            {tab.key === "livebill" && props.kitchenCount > 0 && (
              <span className="st-tab-badge st-tab-badge--bottom">{props.kitchenCount}</span>
            )}
          </span>
          <span className="st-bottom-tab__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Menu Tab ─────────────────────────────────────────────────────────────────

interface MenuTabProps {
  menu: MenuSnapshot | null;
  expandedItemId: string | null;
  selectedOptions: Record<string, string>;
  selectedPrefs: Record<string, Set<string>>;
  addedItemId: string | null;
  pendingKitchenItems: PendingItem[];
  onExpand: (id: string) => void;
  onOptionChange: (key: string, val: string) => void;
  onPrefToggle: (itemId: string, pref: string) => void;
  onAddToOrder: (item: MenuItem, categoryName: string) => void;
  onSendToKitchen: (item: PendingItem) => void;
}

function MenuTab(props: MenuTabProps) {
  const { menu } = props;
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    menu?.categories[0]?.id ?? null
  );

  if (!menu) {
    return <div className="st-empty">Menu not available.</div>;
  }

  const visibleItems = activeCategoryId
    ? menu.items.filter((item) => item.categoryId === activeCategoryId && item.availability !== "hidden")
    : menu.items.filter((item) => item.availability !== "hidden");

  const activeCategoryName = menu.categories.find((c) => c.id === activeCategoryId)?.name ?? "";

  return (
    <div className="st-menu-tab">
      <div className="st-cat-pills">
        {menu.categories.map((cat) => (
          <button
            key={cat.id}
            className={`st-cat-pill${activeCategoryId === cat.id ? " st-cat-pill--active" : ""}`}
            onClick={() => setActiveCategoryId(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="st-empty">No items in this category.</div>
      ) : (
        <div className="st-menu-grid">
          {visibleItems.map((item) => {
            const isExpanded = props.expandedItemId === item.id;
            const justAdded = props.addedItemId !== null &&
              props.pendingKitchenItems.find((p) => p.id === props.addedItemId)?.name === item.name;
            const justAddedItem = justAdded
              ? props.pendingKitchenItems.find((p) => p.id === props.addedItemId) ?? null
              : null;

            if (isExpanded) {
              return (
                <ItemExpanded
                  key={item.id}
                  item={item}
                  categoryName={activeCategoryName}
                  selectedOptions={props.selectedOptions}
                  selectedPrefs={props.selectedPrefs[item.id] ?? new Set()}
                  justAddedItem={justAddedItem}
                  onOptionChange={props.onOptionChange}
                  onPrefToggle={(pref) => props.onPrefToggle(item.id, pref)}
                  onAddToOrder={() => props.onAddToOrder(item, activeCategoryName)}
                  onClose={() => props.onExpand(item.id)}
                  onSendToKitchen={(pending) => props.onSendToKitchen(pending)}
                  onAddMore={() => {
                    props.onExpand(item.id);
                  }}
                />
              );
            }

            return (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => props.onExpand(item.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard(props: { item: MenuItem; onClick: () => void }) {
  const { item } = props;
  const imgUrl = getItemImage(item.name);

  return (
    <article
      className="st-item-card"
      onClick={props.onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") props.onClick(); }}
    >
      <div className="st-item-card__img-wrap">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={item.name}
            fill
            sizes="(max-width: 480px) 50vw, 200px"
            className="st-item-card__img"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="st-item-card__img-placeholder">🍽</div>
        )}
      </div>
      <div className="st-item-card__body">
        <span className="st-item-card__name">{item.name}</span>
        <span className="st-item-card__price">{formatCurrency(item.basePriceCents)}</span>
        {item.description && (
          <p className="st-item-card__desc">{item.description}</p>
        )}
        {item.availability === "sold_out" && (
          <span className="st-item-card__sold-out">Sold out</span>
        )}
      </div>
    </article>
  );
}

// ─── Item Expanded ────────────────────────────────────────────────────────────

function ItemExpanded(props: {
  item: MenuItem;
  categoryName: string;
  selectedOptions: Record<string, string>;
  selectedPrefs: Set<string>;
  justAddedItem: PendingItem | null;
  onOptionChange: (key: string, val: string) => void;
  onPrefToggle: (pref: string) => void;
  onAddToOrder: () => void;
  onClose: () => void;
  onSendToKitchen: (item: PendingItem) => void;
  onAddMore: () => void;
}) {
  const { item, categoryName, selectedOptions, selectedPrefs, justAddedItem } = props;
  const imgUrl = getItemImage(item.name);
  const allergens = getItemAllergens(item.name);
  const opts = getItemOptions(item.name, categoryName);
  const defaults = getItemOptionDefaults(opts);

  return (
    <div className="st-item-expanded" style={{ gridColumn: "1 / -1" }}>
      {imgUrl && (
        <div className="st-item-expanded__img-wrap">
          <Image
            src={imgUrl}
            alt={item.name}
            fill
            sizes="(max-width: 680px) 100vw, 480px"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
      <div className="st-item-expanded__inner">
        <div className="st-item-expanded__header">
          <h3 className="st-item-expanded__name">{item.name}</h3>
          <span className="st-item-expanded__price">{formatCurrency(item.basePriceCents)}</span>
        </div>
        {item.description && (
          <p className="st-item-expanded__desc">{item.description}</p>
        )}

        {justAddedItem ? (
          <KitchenConfirmPanel
            item={justAddedItem}
            onSendToKitchen={() => props.onSendToKitchen(justAddedItem)}
            onAddMore={props.onAddMore}
          />
        ) : (
          <>
            <div className="st-item-expanded__options">
              {opts.map((opt) => {
                if (opt.label === "Preferences") {
                  return (
                    <div key={opt.label} className="st-option-group">
                      <span className="st-option-label">{opt.label}</span>
                      <div className="st-option-prefs">
                        {opt.choices.map((choice) => (
                          <button
                            key={choice}
                            className={`st-pref-btn${selectedPrefs.has(choice) ? " st-pref-btn--active" : ""}`}
                            onClick={() => props.onPrefToggle(choice)}
                          >
                            {selectedPrefs.has(choice) ? "✓ " : ""}{choice}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                const key = `${item.id}_${opt.label}`;
                const selected = selectedOptions[key] ?? defaults[opt.label];
                return (
                  <div key={opt.label} className="st-option-group">
                    <span className="st-option-label">{opt.label}</span>
                    <div className="st-option-choices">
                      {opt.choices.map((choice) => (
                        <button
                          key={choice}
                          className={`st-option-btn${selected === choice ? " st-option-btn--active" : ""}`}
                          onClick={() => props.onOptionChange(key, choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {allergens.length > 0 && (
              <div className="st-allergen-section">
                <span className="st-allergen-title">Allergens</span>
                <div className="st-allergen-chips">
                  {allergens.map((a) => (
                    <span key={a} className="st-allergen-chip">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {item.availability === "sold_out" ? (
              <div className="st-item-expanded__sold-out">Currently sold out</div>
            ) : (
              <button className="st-add-btn" onClick={props.onAddToOrder}>
                Add to Order
              </button>
            )}
          </>
        )}

        <button className="st-close-btn" onClick={props.onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Kitchen Confirm Panel ────────────────────────────────────────────────────

function KitchenConfirmPanel(props: {
  item: PendingItem;
  onSendToKitchen: () => void;
  onAddMore: () => void;
}) {
  const { item } = props;
  return (
    <div className="st-kitchen-confirm">
      <div className="st-kitchen-confirm__check">&#10003; Added: {item.name}</div>
      {item.options.length > 0 && (
        <p className="st-kitchen-confirm__opts">{item.options.join(" · ")}</p>
      )}
      <div className="st-kitchen-confirm__btns">
        <button className="st-kitchen-confirm__send" onClick={props.onSendToKitchen}>
          Send to Kitchen
        </button>
        <button className="st-kitchen-confirm__more" onClick={props.onAddMore}>
          Add More Items
        </button>
      </div>
    </div>
  );
}

// ─── Live Bill Tab ────────────────────────────────────────────────────────────

function LiveBillTab(props: {
  snapshot: import("@taps/contracts").CheckSnapshot | null;
  pendingKitchenItems: PendingItem[];
  onPayShare: () => void;
}) {
  const { snapshot, pendingKitchenItems } = props;
  const kitchenItems = pendingKitchenItems.filter((i) => i.status === "in_kitchen");
  const onTableLines = snapshot ? rootPayableLines(snapshot.lines) : [];

  const totalCents = snapshot?.totalCents ?? 0;
  const paidCents = snapshot?.amountPaidCents ?? 0;
  const remainingCents = snapshot?.remainingBalanceCents ?? 0;

  return (
    <div className="st-livebill-tab">
      <div className="st-bill-summary-bar">
        <div className="st-bill-summary-item">
          <span className="st-bill-summary-label">Total</span>
          <span className="st-bill-summary-value">{formatCurrency(totalCents)}</span>
        </div>
        <div className="st-bill-summary-item">
          <span className="st-bill-summary-label">Paid</span>
          <span className="st-bill-summary-value">{formatCurrency(paidCents)}</span>
        </div>
        <div className="st-bill-summary-item">
          <span className="st-bill-summary-label">Remaining</span>
          <span className="st-bill-summary-value st-bill-summary-value--gold">{formatCurrency(remainingCents)}</span>
        </div>
      </div>

      {kitchenItems.length > 0 && (
        <div className="st-bill-section st-bill-section--kitchen">
          <div className="st-bill-section__head">
            <span>In Kitchen</span>
          </div>
          {kitchenItems.map((item) => (
            <div key={item.id} className="st-bill-line">
              <div className="st-bill-line__info">
                <span className="st-bill-line__name">{item.name}</span>
                {item.options.length > 0 && (
                  <span className="st-bill-line__opts">{item.options.join(" · ")}</span>
                )}
              </div>
              <div className="st-bill-line__right">
                <span className="st-bill-line__price">{formatCurrency(item.price)}</span>
                <span className="st-bill-status--kitchen">In Kitchen</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {onTableLines.length > 0 && (
        <div className="st-bill-section st-bill-section--table">
          <div className="st-bill-section__head">
            <span>On Table</span>
          </div>
          {onTableLines.map((line) => {
            const children = snapshot ? childLines(snapshot.lines, line.id) : [];
            return (
              <div key={line.id}>
                <div className="st-bill-line">
                  <div className="st-bill-line__info">
                    <span className="st-bill-line__name">{line.name}</span>
                  </div>
                  <div className="st-bill-line__right">
                    <span className="st-bill-line__price">{formatCurrency(line.grossCents)}</span>
                  </div>
                </div>
                {children.map((child) => (
                  <div key={child.id} className="st-bill-line st-bill-line--child">
                    <div className="st-bill-line__info">
                      <span className="st-bill-line__name st-bill-line__name--child">{child.name}</span>
                    </div>
                    <div className="st-bill-line__right">
                      <span className="st-bill-line__price">{formatCurrency(child.grossCents)}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {paidCents > 0 && (
        <div className="st-bill-section st-bill-section--paid">
          <div className="st-bill-section__head">
            <span>Paid</span>
          </div>
          <div className="st-bill-line">
            <div className="st-bill-line__info">
              <span className="st-bill-line__name">Amount Paid</span>
            </div>
            <div className="st-bill-line__right">
              <span className="st-bill-line__price st-bill-status--paid">{formatCurrency(paidCents)}</span>
            </div>
          </div>
        </div>
      )}

      {onTableLines.length === 0 && kitchenItems.length === 0 && (
        <div className="st-empty">Your bill will appear here once items are added.</div>
      )}

      {remainingCents > 0 && (
        <button className="st-pay-cta" onClick={props.onPayShare}>
          Pay Your Share &mdash; {formatCurrency(remainingCents)}
        </button>
      )}
    </div>
  );
}

// ─── Split Tab ────────────────────────────────────────────────────────────────

function SplitTab(props: { publicToken: string; summary: GetSessionStatusResponse }) {
  return (
    <div className="st-split-tab">
      <div className="st-split-header">
        <h2 className="st-split-title">Split the Bill</h2>
        <p className="st-split-sub">Choose how to divide what&rsquo;s left.</p>
      </div>
      <SplitFlow publicToken={props.publicToken} initialSummary={props.summary} />
    </div>
  );
}

// ─── Status Tab ───────────────────────────────────────────────────────────────

function StatusTab(props: { summary: GetSessionStatusResponse; publicToken: string }) {
  const { summary } = props;
  const settlement = summary.settlement;
  const payers = summary.payers ?? [];
  const completedCount = payers.filter((p) => p.status === "completed").length;

  return (
    <div className="st-status-tab">
      <div className="st-status-card">
        <div className="st-status-row">
          <span className="st-status-label">Table Balance Remaining</span>
          <span className="st-status-value">
            {settlement ? formatCurrency(settlement.remainingBalanceCents) : "—"}
          </span>
        </div>
        <div className="st-status-row">
          <span className="st-status-label">Payers Completed</span>
          <span className="st-status-value">
            {completedCount} of {payers.length}
          </span>
        </div>
        <div className="st-status-row">
          <span className="st-status-label">Table Closeable</span>
          <span className={`st-status-value${settlement?.tableCloseable ? " st-status-value--yes" : " st-status-value--no"}`}>
            {settlement ? (settlement.tableCloseable ? "Yes" : "Not Yet") : "—"}
          </span>
        </div>
      </div>

      <Link href={`/session/${props.publicToken}/status`} className="st-status-link">
        View Full Status
      </Link>
    </div>
  );
}

// ─── Request Server Button ────────────────────────────────────────────────────

function RequestServerButton(props: { publicToken: string }) {
  const [state, setState] = useState<"idle" | "requesting" | "done">("idle");

  async function handleClick() {
    if (state !== "idle") return;
    setState("requesting");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
      await fetch(`${apiBase}/public/sessions/${props.publicToken}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken: props.publicToken }),
      });
    } catch {
      // still show done
    }
    setState("done");
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <button className="st-request-server" onClick={handleClick} disabled={state !== "idle"}>
      {state === "idle" && "Request Server"}
      {state === "requesting" && "Requesting..."}
      {state === "done" && "Server Notified"}
    </button>
  );
}
