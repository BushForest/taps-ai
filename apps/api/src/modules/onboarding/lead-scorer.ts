// Lead scoring engine — ported from the lead-finder app's criteria.ts.
// Self-contained: no imports from the lead-finder app or external packages.
// Scores a restaurant by NFC fit criteria and returns a tier + breakdown.

// ── High-value NFC-fit category sets ─────────────────────────────────────────
const HIGH_VALUE_CATEGORIES = new Set([
  "sports_bar",
  "gastropub",
  "wine_bar",
  "brewery",
  "bar",
  "bar_and_grill",
]);

const MID_VALUE_CATEGORIES = new Set([
  "american_restaurant",
  "steak_house",
  "seafood_restaurant",
  "italian_restaurant",
  "pizza_restaurant",
  "mexican_restaurant",
  "brunch_restaurant",
  "barbecue_restaurant",
  "sushi_restaurant",
  "ramen_restaurant",
  "mediterranean_restaurant",
  "thai_restaurant",
  "japanese_restaurant",
  "chinese_restaurant",
  "indian_restaurant",
  "vietnamese_restaurant",
  "restaurant",
]);

const LOW_VALUE_CATEGORIES = new Set([
  "fast_food_restaurant",
  "coffee_shop",
  "cafe",
  "bakery",
  "sandwich_shop",
  "burger_restaurant",
  "chicken_restaurant",
  "breakfast_restaurant",
  "meal_delivery",
  "meal_takeaway",
]);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RestaurantInput {
  name: string;
  categories: string[];
  priceRange?: number;
  /** Raw rating (e.g. 4.5). If sourced from the DB where it is stored ×10, divide before passing. */
  rating?: number;
  reviewCount?: number;
  hasOnlineOrdering?: boolean;
  lat?: number;
  lon?: number;
}

export interface ScoredLead extends RestaurantInput {
  score: number;
  tier: "hot" | "good" | "possible" | "no_fit";
  scoreBreakdown: {
    categories: number;
    priceRange: number;
    rating: number;
    reviewCount: number;
  };
  fitReasons: string[];
  warnings: string[];
  posHint?: string;
}

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreCategories(categories: string[]): { score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 15; // default for unknown categories

  const hasHighValue = categories.some((c) => HIGH_VALUE_CATEGORIES.has(c));

  if (hasHighValue) {
    score = 35;
    const matched = categories.filter((c) => HIGH_VALUE_CATEGORIES.has(c));
    reasons.push(`High-value category (${matched.join(", ")})`);
  } else if (categories.some((c) => MID_VALUE_CATEGORIES.has(c))) {
    score = 25;
    const matched = categories.filter((c) => MID_VALUE_CATEGORIES.has(c));
    reasons.push(`Good category fit (${matched[0]})`);
  } else if (categories.some((c) => LOW_VALUE_CATEGORIES.has(c))) {
    score = 5;
    const matched = categories.filter((c) => LOW_VALUE_CATEGORIES.has(c));
    warnings.push(`Low NFC fit category (${matched[0]})`);
  }

  return { score, reasons, warnings };
}

function scorePriceRange(priceRange?: number): { score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 10; // missing

  if (priceRange === 3 || priceRange === 4) {
    score = 25;
    reasons.push("Premium price range");
  } else if (priceRange === 2) {
    score = 15;
  } else if (priceRange === 1) {
    score = 5;
    warnings.push("Budget price range — lower average check");
  }

  return { score, reasons, warnings };
}

function scoreRating(rating?: number): { score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 8; // missing

  if (rating != null) {
    if (rating >= 4.5) {
      score = 20;
      reasons.push(`Strong reviews (${rating.toFixed(1)}★)`);
    } else if (rating >= 4.0) {
      score = 15;
      reasons.push(`Good rating (${rating.toFixed(1)}★)`);
    } else if (rating >= 3.5) {
      score = 10;
    } else if (rating >= 3.0) {
      score = 5;
      warnings.push(`Below-average rating (${rating.toFixed(1)}★)`);
    } else {
      score = 0;
      warnings.push(`Low rating (${rating.toFixed(1)}★)`);
    }
  }

  return { score, reasons, warnings };
}

function scoreReviewCount(reviewCount?: number): { score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 5; // missing

  if (reviewCount != null) {
    if (reviewCount >= 500) {
      score = 20;
      reasons.push(`High review volume (${reviewCount}+)`);
    } else if (reviewCount >= 200) {
      score = 15;
    } else if (reviewCount >= 50) {
      score = 10;
    } else if (reviewCount >= 10) {
      score = 5;
    } else {
      score = 2;
      warnings.push("Very few reviews — unproven venue");
    }
  } else {
    warnings.push("Review count unavailable");
  }

  return { score, reasons, warnings };
}

function assignTier(score: number): ScoredLead["tier"] {
  if (score >= 75) return "hot";
  if (score >= 55) return "good";
  if (score >= 35) return "possible";
  return "no_fit";
}

function derivePosHint(categories: string[]): string | undefined {
  if (categories.some((c) => c === "sports_bar" || c === "bar" || c === "bar_and_grill")) {
    return "likely Square or Toast";
  }
  if (categories.some((c) => c === "coffee_shop" || c === "cafe")) {
    return "likely Square";
  }
  return undefined;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function scoreRestaurant(input: RestaurantInput): ScoredLead {
  const catResult = scoreCategories(input.categories);
  const priceResult = scorePriceRange(input.priceRange);
  const ratingResult = scoreRating(input.rating);
  const reviewResult = scoreReviewCount(input.reviewCount);

  const rawScore =
    catResult.score + priceResult.score + ratingResult.score + reviewResult.score;
  const score = Math.min(100, rawScore);
  const tier = assignTier(score);

  const fitReasons = [
    ...catResult.reasons,
    ...priceResult.reasons,
    ...ratingResult.reasons,
    ...reviewResult.reasons,
  ];
  const warnings = [
    ...catResult.warnings,
    ...priceResult.warnings,
    ...ratingResult.warnings,
    ...reviewResult.warnings,
  ];

  return {
    ...input,
    score,
    tier,
    scoreBreakdown: {
      categories: catResult.score,
      priceRange: priceResult.score,
      rating: ratingResult.score,
      reviewCount: reviewResult.score,
    },
    fitReasons,
    warnings,
    posHint: derivePosHint(input.categories),
  };
}
