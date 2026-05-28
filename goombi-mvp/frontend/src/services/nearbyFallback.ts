import type { NearbyServiceItem, ServiceCategory, ServiceGroup } from "../types/services";

const PROVINCE_CENTERS: Record<string, { lat: number; lon: number }> = {
  "gauteng": { lat: -26.2041, lon: 28.0473 },
  "western cape": { lat: -33.9249, lon: 18.4241 },
  "kwa-zulu natal": { lat: -29.8587, lon: 31.0218 },
  "kwazulu-natal": { lat: -29.8587, lon: 31.0218 },
  "kzn": { lat: -29.8587, lon: 31.0218 },
};

const CATEGORY_ORDER: Record<string, ServiceCategory[]> = {
  "gauteng": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
  "kwa-zulu natal": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
  "kwazulu-natal": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
  "western cape": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
};

const SERVICE_META: Record<ServiceCategory, { emoji: string; label: string }> = {
  gym: { emoji: "🏋️", label: "Gym / Fitness" },
  shopping: { emoji: "🛒", label: "Shopping Centre" },
  fuel: { emoji: "⛽", label: "Fuel Station" },
  hospital: { emoji: "🏥", label: "Hospital" },
  clinic: { emoji: "💊", label: "Clinic / Doctor" },
  police: { emoji: "👮", label: "Police Station" },
  restaurant: { emoji: "🍽️", label: "Restaurant / Cafe" },
  atm: { emoji: "🏧", label: "ATM / Bank" },
  supermarket: { emoji: "🛍️", label: "Grocery / Supermarket" },
  pharmacy: { emoji: "💊", label: "Pharmacy" },
  transit: { emoji: "🚉", label: "Transit Stop" },
  ev_charging: { emoji: "⚡", label: "EV Charging" },
  workspace: { emoji: "💼", label: "Workspace" },
  attraction: { emoji: "🎟️", label: "Event / Attraction" },
  parking: { emoji: "🅿️", label: "Parking / Access" },
};

const FALLBACK_NAME: Record<ServiceCategory, string> = {
  gym: "Estimated accommodation support option",
  shopping: "Estimated retail / convenience option",
  fuel: "Estimated fuel / transport service",
  hospital: "Estimated pharmacy / health service",
  clinic: "Estimated pharmacy / health service",
  police: "Estimated accommodation support option",
  restaurant: "Estimated café / food option",
  atm: "Estimated retail / convenience option",
  supermarket: "Estimated retail / convenience option",
  pharmacy: "Estimated pharmacy / health service",
  transit: "Estimated parking / access point",
  ev_charging: "Estimated fuel / transport service",
  workspace: "Estimated accommodation support option",
  attraction: "Estimated retail / convenience option",
  parking: "Estimated parking / access point",
};

const FALLBACK_REASON = "External nearby service provider unavailable";

export type NearbyLookupContext = {
  lat?: number | null;
  lon?: number | null;
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
};

function normalize(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

function hasCoords(context: NearbyLookupContext): boolean {
  return Number.isFinite(context.lat) && Number.isFinite(context.lon);
}

export function hasLocationHint(context: NearbyLookupContext): boolean {
  return hasCoords(context);
}

function stableSeed(...parts: Array<string | number | null | undefined>): number {
  const text = parts
    .filter((part) => part !== null && part !== undefined)
    .map((part) => String(part).trim().toLowerCase())
    .join("|");
  if (!text) return 17;
  let sum = 0;
  for (let idx = 0; idx < text.length; idx += 1) {
    sum += (idx + 1) * text.charCodeAt(idx);
  }
  return sum;
}

function baseCoords(context: NearbyLookupContext): { lat: number; lon: number } | null {
  if (hasCoords(context)) {
    return { lat: Number(context.lat), lon: Number(context.lon) };
  }
  const provinceKey = normalize(context.province);
  return PROVINCE_CENTERS[provinceKey] || null;
}

function offsetCoords(lat: number, lon: number, distanceKm: number, bearingDeg: number): { lat: number; lon: number } {
  const bearing = (bearingDeg * Math.PI) / 180;
  const latDelta = (distanceKm / 111) * Math.cos(bearing);
  const lonScale = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const lonDelta = (distanceKm / (111 * lonScale)) * Math.sin(bearing);
  return { lat: lat + latDelta, lon: lon + lonDelta };
}

function categorySet(context: NearbyLookupContext): ServiceCategory[] {
  const provinceKey = normalize(context.province);
  return CATEGORY_ORDER[provinceKey] || ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"];
}

export function buildDemoNearbyServiceGroups(context: NearbyLookupContext): ServiceGroup[] {
  const base = baseCoords(context);
  if (!base) return [];

  const seed = stableSeed(context.suburb, context.city, context.province, context.lat, context.lon);
  const ordered = categorySet(context);
  const count = 4 + (seed % 5);
  const chosen = Array.from({ length: count }, (_, index) => ordered[index % ordered.length]);
  const distances = [0.9, 1.2, 1.6, 2.1, 2.8, 3.4, 4.2, 5.1];

  return chosen.map((category, index) => {
    const distanceKm = Number(distances[(seed + index) % distances.length].toFixed(2));
    const bearing = (seed + index * 47) % 360;
    const point = offsetCoords(base.lat, base.lon, distanceKm, bearing);
    const meta = SERVICE_META[category];
    const nearest: NearbyServiceItem = {
      id: seed * 100 + index + 1,
      name: FALLBACK_NAME[category],
      lat: Number(point.lat.toFixed(6)),
      lon: Number(point.lon.toFixed(6)),
      distanceKm,
      source: "fallback",
      isFallback: true,
      badgeLabel: "Fallback estimate",
      reason: FALLBACK_REASON,
    };

    return {
      category,
      emoji: meta.emoji,
      label: meta.label,
      nearest,
    };
  });
}
