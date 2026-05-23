// Get your free API key at https://foursquare.com/developers
// Add to frontend/.env.local as VITE_FOURSQUARE_API_KEY

import { haversineKm } from "../utils/haversine";

export type FoursquareVenue = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

// Foursquare category IDs for dining
const DINING_CATEGORIES = [
  "13065", // Restaurant
  "13032", // Café / Coffee shop
  "10032", // Bar / Nightlife
  "13145", // Fast food
  "13002", // Bakery
  "10058", // Wine bar
  "13072", // Steakhouse
  "13314", // Sushi
  "13064", // Pizza
].join(",");

type FSQResult = {
  fsq_id: string;
  name: string;
  categories?: Array<{ name: string; short_name?: string }>;
  geocodes?: {
    main?: { latitude: number; longitude: number };
    roof?: { latitude: number; longitude: number };
  };
};

type FSQResponse = { results?: FSQResult[] };

export async function fetchFoursquareDining(lat: number, lng: number): Promise<FoursquareVenue[]> {
  const apiKey = import.meta.env.VITE_FOURSQUARE_API_KEY as string | undefined;
  if (!apiKey) {
    console.log("[Foursquare] No API key — skipping dining fetch");
    return [];
  }

  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("ll", `${lat},${lng}`);
  url.searchParams.set("radius", "5000");
  url.searchParams.set("limit", "50");
  url.searchParams.set("categories", DINING_CATEGORIES);
  url.searchParams.set("fields", "fsq_id,name,categories,geocodes");

  console.log("[Foursquare] Fetching dining near", lat, lng);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      console.warn("[Foursquare] HTTP", res.status);
      return [];
    }

    const data: FSQResponse = await res.json();
    const results = data.results ?? [];
    console.log("[Foursquare] Received", results.length, "venues");

    return results
      .map((r): FoursquareVenue | null => {
        const coords = r.geocodes?.main ?? r.geocodes?.roof;
        if (!coords) return null;
        return {
          id: r.fsq_id,
          name: r.name,
          category: r.categories?.[0]?.short_name ?? r.categories?.[0]?.name ?? "Dining",
          lat: coords.latitude,
          lon: coords.longitude,
          distanceKm: haversineKm(lat, lng, coords.latitude, coords.longitude),
        };
      })
      .filter((v): v is FoursquareVenue => v !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  } catch (err) {
    console.warn("[Foursquare] Fetch failed:", err);
    return [];
  }
}
