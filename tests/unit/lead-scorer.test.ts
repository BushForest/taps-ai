import { describe, expect, it } from "vitest";
import { scoreRestaurant } from "../../apps/api/src/modules/onboarding/lead-scorer";

describe("lead scorer", () => {
  // ── Category scoring ─────────────────────────────────────────────────────────

  it("scores high-value categories (sports_bar, gastropub) at 35 pts", () => {
    const result = scoreRestaurant({ name: "Test", categories: ["sports_bar"] });
    expect(result.scoreBreakdown.categories).toBe(35);
    expect(result.fitReasons).toEqual(expect.arrayContaining([expect.stringContaining("High-value")]));
  });

  it("scores mid-value categories (italian_restaurant) at 25 pts", () => {
    const result = scoreRestaurant({ name: "Test", categories: ["italian_restaurant"] });
    expect(result.scoreBreakdown.categories).toBe(25);
    expect(result.fitReasons).toEqual(expect.arrayContaining([expect.stringContaining("Good category")]));
  });

  it("scores low-value categories (fast_food_restaurant) at 5 pts with warning", () => {
    const result = scoreRestaurant({ name: "Test", categories: ["fast_food_restaurant"] });
    expect(result.scoreBreakdown.categories).toBe(5);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Low NFC fit")]));
  });

  it("scores unknown categories at 15 pts (default)", () => {
    const result = scoreRestaurant({ name: "Test", categories: ["unknown_place_type"] });
    expect(result.scoreBreakdown.categories).toBe(15);
  });

  it("prioritises high-value over mid-value when both present", () => {
    const result = scoreRestaurant({ name: "Test", categories: ["bar", "restaurant"] });
    expect(result.scoreBreakdown.categories).toBe(35);
  });

  // ── Price range scoring ──────────────────────────────────────────────────────

  it("scores price range 3 or 4 at 25 pts (premium)", () => {
    expect(scoreRestaurant({ name: "T", categories: [], priceRange: 3 }).scoreBreakdown.priceRange).toBe(25);
    expect(scoreRestaurant({ name: "T", categories: [], priceRange: 4 }).scoreBreakdown.priceRange).toBe(25);
  });

  it("scores price range 2 at 15 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], priceRange: 2 }).scoreBreakdown.priceRange).toBe(15);
  });

  it("scores price range 1 at 5 pts with budget warning", () => {
    const result = scoreRestaurant({ name: "T", categories: [], priceRange: 1 });
    expect(result.scoreBreakdown.priceRange).toBe(5);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Budget")]));
  });

  it("scores missing price range at 10 pts (default)", () => {
    expect(scoreRestaurant({ name: "T", categories: [] }).scoreBreakdown.priceRange).toBe(10);
  });

  // ── Rating scoring ───────────────────────────────────────────────────────────

  it("scores rating >= 4.5 at 20 pts", () => {
    const result = scoreRestaurant({ name: "T", categories: [], rating: 4.5 });
    expect(result.scoreBreakdown.rating).toBe(20);
    expect(result.fitReasons).toEqual(expect.arrayContaining([expect.stringContaining("Strong reviews")]));
  });

  it("scores rating 4.0–4.49 at 15 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], rating: 4.0 }).scoreBreakdown.rating).toBe(15);
    expect(scoreRestaurant({ name: "T", categories: [], rating: 4.49 }).scoreBreakdown.rating).toBe(15);
  });

  it("scores rating 3.5–3.99 at 10 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], rating: 3.5 }).scoreBreakdown.rating).toBe(10);
  });

  it("scores rating 3.0–3.49 at 5 pts with warning", () => {
    const result = scoreRestaurant({ name: "T", categories: [], rating: 3.2 });
    expect(result.scoreBreakdown.rating).toBe(5);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Below-average")]));
  });

  it("scores rating < 3.0 at 0 pts with warning", () => {
    const result = scoreRestaurant({ name: "T", categories: [], rating: 2.5 });
    expect(result.scoreBreakdown.rating).toBe(0);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Low rating")]));
  });

  it("scores missing rating at 8 pts (default)", () => {
    expect(scoreRestaurant({ name: "T", categories: [] }).scoreBreakdown.rating).toBe(8);
  });

  // ── Review count scoring ─────────────────────────────────────────────────────

  it("scores reviewCount >= 500 at 20 pts", () => {
    const result = scoreRestaurant({ name: "T", categories: [], reviewCount: 500 });
    expect(result.scoreBreakdown.reviewCount).toBe(20);
    expect(result.fitReasons).toEqual(expect.arrayContaining([expect.stringContaining("High review volume")]));
  });

  it("scores reviewCount 200–499 at 15 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], reviewCount: 200 }).scoreBreakdown.reviewCount).toBe(15);
  });

  it("scores reviewCount 50–199 at 10 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], reviewCount: 50 }).scoreBreakdown.reviewCount).toBe(10);
  });

  it("scores reviewCount 10–49 at 5 pts", () => {
    expect(scoreRestaurant({ name: "T", categories: [], reviewCount: 10 }).scoreBreakdown.reviewCount).toBe(5);
  });

  it("scores reviewCount < 10 at 2 pts with warning", () => {
    const result = scoreRestaurant({ name: "T", categories: [], reviewCount: 5 });
    expect(result.scoreBreakdown.reviewCount).toBe(2);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Very few reviews")]));
  });

  it("scores missing reviewCount at 5 pts with warning", () => {
    const result = scoreRestaurant({ name: "T", categories: [] });
    expect(result.scoreBreakdown.reviewCount).toBe(5);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Review count unavailable")]));
  });

  // ── Tier assignment ──────────────────────────────────────────────────────────

  it("assigns hot tier at score >= 75", () => {
    // sports_bar(35) + price3(25) + rating4.5(20) + count500(20) = 100 → capped at 100
    const result = scoreRestaurant({
      name: "T", categories: ["sports_bar"], priceRange: 3, rating: 4.5, reviewCount: 500,
    });
    expect(result.tier).toBe("hot");
    expect(result.score).toBe(100);
  });

  it("assigns good tier at score 55–74", () => {
    // mid(25) + price3(25) + rating4.0(15) = 65, missing reviewCount(5) = 70
    const result = scoreRestaurant({
      name: "T", categories: ["italian_restaurant"], priceRange: 3, rating: 4.0,
    });
    expect(result.tier).toBe("good");
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThan(75);
  });

  it("assigns possible tier at score 35–54", () => {
    // mid(25) + price2(15) + no rating(8) + no reviewCount(5) = 53
    const result = scoreRestaurant({
      name: "T", categories: ["italian_restaurant"], priceRange: 2,
    });
    expect(result.tier).toBe("possible");
    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.score).toBeLessThan(55);
  });

  it("assigns no_fit tier at score < 35", () => {
    // low_cat(5) + price1(5) + rating2.5(0) + count5(2) = 12
    const result = scoreRestaurant({
      name: "T", categories: ["fast_food_restaurant"], priceRange: 1, rating: 2.5, reviewCount: 5,
    });
    expect(result.tier).toBe("no_fit");
    expect(result.score).toBeLessThan(35);
  });

  // ── POS hint ─────────────────────────────────────────────────────────────────

  it("derives 'likely Square or Toast' posHint for bar categories", () => {
    const result = scoreRestaurant({ name: "T", categories: ["sports_bar"] });
    expect(result.posHint).toBe("likely Square or Toast");
  });

  it("derives 'likely Square' posHint for coffee_shop", () => {
    const result = scoreRestaurant({ name: "T", categories: ["coffee_shop"] });
    expect(result.posHint).toBe("likely Square");
  });

  it("returns undefined posHint for restaurant with no POS signal", () => {
    const result = scoreRestaurant({ name: "T", categories: ["italian_restaurant"] });
    expect(result.posHint).toBeUndefined();
  });

  // ── Score cap ────────────────────────────────────────────────────────────────

  it("caps score at 100 even when raw total exceeds 100", () => {
    const result = scoreRestaurant({
      name: "T", categories: ["sports_bar"], priceRange: 3, rating: 4.8, reviewCount: 600,
    });
    expect(result.score).toBe(100);
  });
});
