import type { MenuItem, MenuModifierGroup, MenuSnapshot } from "@taps/contracts";
import { formatCurrency } from "../lib/format";

export function PublicMenuSections(props: { menu: MenuSnapshot }) {
  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const category of props.menu.categories) {
    itemsByCategory.set(category.id, []);
  }

  for (const item of props.menu.items) {
    itemsByCategory.get(item.categoryId)?.push(item);
  }

  return (
    <div className="public-menu-grid">
      {props.menu.categories.map((category) => {
        const items = itemsByCategory.get(category.id) ?? [];
        return (
          <section key={category.id} id={`menu-${category.id}`} className="public-menu-section">
            <div className="public-menu-section__header">
              <div>
                <p className="public-menu-section__label">Common House</p>
                <h2 className="public-menu-section__title">{category.name}</h2>
              </div>
              <span className="restaurant-meta-chip">{items.length} dishes</span>
            </div>
            <div className="public-menu-items">
              {items.map((item) => (
                <article key={item.id} className="public-menu-item">
                  <div className="public-menu-item__top">
                    <div style={{ display: "grid", gap: 6 }}>
                      <h3 className="public-menu-item__name">{item.name}</h3>
                      {item.description ? <p className="public-menu-item__description">{item.description}</p> : null}
                    </div>
                    <span className="public-menu-item__price">{formatCurrency(item.basePriceCents)}</span>
                  </div>
                  <div className="restaurant-chip-row">
                    <span className="soft-chip">
                      {item.availability === "sold_out" ? "Sold out" : item.availability === "hidden" ? "Hidden" : "Available tonight"}
                    </span>
                    {item.modifiers.length ? <span className="soft-chip">{item.modifiers.length} modifier group{item.modifiers.length === 1 ? "" : "s"}</span> : null}
                    {item.addOns.length ? <span className="soft-chip">{item.addOns.length} add-on group{item.addOns.length === 1 ? "" : "s"}</span> : null}
                  </div>
                  {item.modifiers.length ? (
                    <div className="menu-group-list">
                      {item.modifiers.map((group) => (
                        <MenuGroup key={group.id} label={group.name} group={group} />
                      ))}
                    </div>
                  ) : null}
                  {item.addOns.length ? (
                    <div className="menu-group-list">
                      {item.addOns.map((group) => (
                        <MenuGroup key={group.id} label={group.name} group={group} />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MenuGroup(props: { label: string; group: MenuModifierGroup }) {
  return (
    <div className="menu-group">
      <strong>{props.label}</strong>
      <span className="stat-detail">
        {props.group.options
          .filter((option) => option.availability !== "hidden")
          .map((option) =>
            option.priceDeltaCents > 0 ? `${option.name} (+${formatCurrency(option.priceDeltaCents)})` : option.name
          )
          .join(", ")}
      </span>
    </div>
  );
}
