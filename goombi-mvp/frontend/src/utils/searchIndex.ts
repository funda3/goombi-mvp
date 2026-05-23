import { isWorkspace, type Listing } from "../types/listing";

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, idx)) +
    "<mark>" +
    escapeHtml(text.slice(idx, idx + query.length)) +
    "</mark>" +
    escapeHtml(text.slice(idx + query.length))
  );
}

export type SuburbResult = {
  type: "suburb";
  suburb: string;
  province: string;
  lat: number;
  lng: number;
  count: number;
  distanceKm: number;
};

export type ListingResult = {
  type: "accommodation" | "workspace";
  listing: Listing;
  distanceKm: number;
};

export type SearchResults = {
  suburbs: SuburbResult[];
  accommodation: ListingResult[];
  workspaces: ListingResult[];
};

function scoreMatch(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return 99;
}

function matchesListing(listing: Listing, q: string): boolean {
  return (
    listing.name.toLowerCase().includes(q) ||
    listing.suburb.toLowerCase().includes(q) ||
    listing.province.toLowerCase().includes(q) ||
    (listing.provider_name?.toLowerCase().includes(q) ?? false) ||
    listing.description.toLowerCase().includes(q) ||
    listing.amenities.some((a) => a.toLowerCase().includes(q))
  );
}

/** Pre-processes listings into a searchable index (normalised pass-through at this scale). */
export function buildSearchIndex(listings: Listing[]): Listing[] {
  return listings;
}

export function searchListings(
  query: string,
  index: Listing[],
  centerLat: number,
  centerLng: number,
): SearchResults {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { suburbs: [], accommodation: [], workspaces: [] };

  const suburbMap = new Map<string, { province: string; lats: number[]; lngs: number[] }>();
  for (const l of index) {
    let s = suburbMap.get(l.suburb);
    if (!s) {
      s = { province: l.province, lats: [], lngs: [] };
      suburbMap.set(l.suburb, s);
    }
    s.lats.push(l.latitude);
    s.lngs.push(l.longitude);
  }

  const suburbs: SuburbResult[] = [];
  for (const [suburb, data] of suburbMap) {
    if (!suburb.toLowerCase().includes(q)) continue;
    const lat = data.lats.reduce((a, b) => a + b, 0) / data.lats.length;
    const lng = data.lngs.reduce((a, b) => a + b, 0) / data.lngs.length;
    suburbs.push({
      type: "suburb",
      suburb,
      province: data.province,
      lat,
      lng,
      count: data.lats.length,
      distanceKm: haversineKm(centerLat, centerLng, lat, lng),
    });
  }
  suburbs.sort((a, b) => scoreMatch(a.suburb, q) - scoreMatch(b.suburb, q));

  const accommodation: ListingResult[] = [];
  const workspaces: ListingResult[] = [];
  for (const l of index) {
    if (!matchesListing(l, q)) continue;
    const item: ListingResult = {
      type: isWorkspace(l) ? "workspace" : "accommodation",
      listing: l,
      distanceKm: haversineKm(centerLat, centerLng, l.latitude, l.longitude),
    };
    if (isWorkspace(l)) workspaces.push(item);
    else accommodation.push(item);
  }
  accommodation.sort((a, b) => scoreMatch(a.listing.name, q) - scoreMatch(b.listing.name, q));
  workspaces.sort((a, b) => scoreMatch(a.listing.name, q) - scoreMatch(b.listing.name, q));

  return {
    suburbs: suburbs.slice(0, 3),
    accommodation: accommodation.slice(0, 3),
    workspaces: workspaces.slice(0, 3),
  };
}
