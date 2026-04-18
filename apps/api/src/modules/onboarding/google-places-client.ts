// Google Places New API (places.googleapis.com/v1) client for restaurant data enrichment.
// Used during onboarding to pre-populate restaurant details from public data.

// ── Food-related type filter ──────────────────────────────────────────────────
const FOOD_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "food",
  "meal_delivery",
  "meal_takeaway",
  "american_restaurant",
  "mexican_restaurant",
  "seafood_restaurant",
  "italian_restaurant",
  "pizza_restaurant",
  "japanese_restaurant",
  "chinese_restaurant",
  "thai_restaurant",
  "vietnamese_restaurant",
  "mediterranean_restaurant",
  "indian_restaurant",
  "brunch_restaurant",
  "fast_food_restaurant",
  "coffee_shop",
  "steak_house",
  "bar_and_grill",
  "barbecue_restaurant",
  "breakfast_restaurant",
  "burger_restaurant",
  "chicken_restaurant",
  "sandwich_shop",
  "ramen_restaurant",
  "sushi_restaurant",
  "wine_bar",
  "sports_bar",
  "brewery",
  "gastropub",
]);

function filterFoodTypes(types?: string[]): string[] {
  if (!types) return [];
  return types.filter((t) => FOOD_TYPES.has(t));
}

// ── Price level mapping ───────────────────────────────────────────────────────
function mapPriceLevel(level?: string): 1 | 2 | 3 | 4 | undefined {
  const map: Record<string, 1 | 2 | 3 | 4> = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return level ? map[level] : undefined;
}

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface PlaceLookupResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  phoneNumber?: string;
  website?: string;
  cuisineTypes: string[];
  priceLevel?: 1 | 2 | 3 | 4;
  rating?: number;
  timezone?: string;
  location?: {
    lat: number;
    lng: number;
  };
  photoUris?: string[];
  hours?: {
    weekdayText: string[];
  };
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  cuisineTypes: string[];
}

// ── Client ────────────────────────────────────────────────────────────────────
export class GooglePlacesClient {
  private readonly apiKey: string;
  private readonly baseUrl = "https://places.googleapis.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Search for restaurants by text query. Returns top 5 results. */
  async searchRestaurants(
    query: string,
    location?: { lat: number; lng: number; radius?: number }
  ): Promise<PlaceSearchResult[]> {
    try {
      const body: Record<string, unknown> = {
        textQuery: query,
        includedType: "restaurant",
        maxResultCount: 5,
      };
      if (location) {
        body["locationBias"] = {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: location.radius ?? 5000,
          },
        };
      }
      const res = await fetch(`${this.baseUrl}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.primaryTypeDisplayName,places.types",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error(
          `[GooglePlacesClient] searchRestaurants error ${res.status}: ${await res.text()}`
        );
        return [];
      }
      const data = (await res.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          rating?: number;
          types?: string[];
        }>;
      };
      return (data.places ?? []).map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        formattedAddress: p.formattedAddress ?? "",
        rating: p.rating,
        cuisineTypes: filterFoodTypes(p.types),
      }));
    } catch (err) {
      console.error("[GooglePlacesClient] searchRestaurants fetch failed:", err);
      return [];
    }
  }

  /** Fetch full details for a place ID (from a prior search). */
  async getPlaceDetails(placeId: string): Promise<PlaceLookupResult | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,types,priceLevel,rating,location,photos,regularOpeningHours,timeZone",
          },
        }
      );
      if (!res.ok) {
        console.error(
          `[GooglePlacesClient] getPlaceDetails error ${res.status}: ${await res.text()}`
        );
        return null;
      }
      const place = (await res.json()) as {
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        nationalPhoneNumber?: string;
        websiteUri?: string;
        types?: string[];
        priceLevel?: string;
        rating?: number;
        location?: { latitude: number; longitude: number };
        photos?: Array<{ name: string }>;
        regularOpeningHours?: { weekdayDescriptions?: string[] };
        timeZone?: { id: string };
      };
      const photoUris = (place.photos ?? [])
        .slice(0, 3)
        .map(
          (photo) =>
            `${this.baseUrl}/${photo.name}/media?maxWidthPx=400&key=${this.apiKey}`
        );
      return {
        placeId: place.id,
        name: place.displayName?.text ?? "",
        formattedAddress: place.formattedAddress ?? "",
        phoneNumber: place.nationalPhoneNumber,
        website: place.websiteUri,
        cuisineTypes: filterFoodTypes(place.types),
        priceLevel: mapPriceLevel(place.priceLevel),
        rating: place.rating,
        timezone: place.timeZone?.id,
        location:
          place.location != null
            ? { lat: place.location.latitude, lng: place.location.longitude }
            : undefined,
        photoUris: photoUris.length > 0 ? photoUris : undefined,
        hours:
          place.regularOpeningHours?.weekdayDescriptions != null
            ? { weekdayText: place.regularOpeningHours.weekdayDescriptions }
            : undefined,
      };
    } catch (err) {
      console.error("[GooglePlacesClient] getPlaceDetails fetch failed:", err);
      return null;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export function createGooglePlacesClient(): GooglePlacesClient | null {
  const key =
    process.env["GOOGLE_PLACES_API_KEY"] ?? process.env["GOOGLE_API_KEY"];
  if (!key) return null;
  return new GooglePlacesClient(key);
}
