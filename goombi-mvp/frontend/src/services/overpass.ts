import { haversineKm } from "../utils/haversine";
import type { NearbyServiceItem, ServiceCategory, ServiceGroup } from "../types/services";

// ---------------------------------------------------------------------------
// Service definitions — Overpass tag filters + display config
// ---------------------------------------------------------------------------

type ServiceDef = {
  emoji: string;
  label: string;
  filters: Array<Record<string, string>>;
};

export const SERVICE_DEFS: Record<ServiceCategory, ServiceDef> = {
  gym:         { emoji: "🏋️", label: "Gym / Fitness",     filters: [{ amenity: "gym" }, { leisure: "fitness_centre" }] },
  shopping:    { emoji: "🛒", label: "Shopping Centre",   filters: [{ shop: "mall" }, { shop: "department_store" }] },
  fuel:        { emoji: "⛽", label: "Fuel Station",      filters: [{ amenity: "fuel" }] },
  hospital:    { emoji: "🏥", label: "Hospital",           filters: [{ amenity: "hospital" }] },
  clinic:      { emoji: "💊", label: "Clinic / Doctor",   filters: [{ amenity: "clinic" }, { amenity: "doctors" }] },
  police:      { emoji: "👮", label: "Police Station",    filters: [{ amenity: "police" }] },
  restaurant:  { emoji: "🍽️", label: "Restaurant / Café", filters: [{ amenity: "restaurant" }, { amenity: "cafe" }] },
  atm:         { emoji: "🏧", label: "ATM / Bank",        filters: [{ amenity: "atm" }, { amenity: "bank" }] },
  supermarket: { emoji: "🛍️", label: "Supermarket",       filters: [{ shop: "supermarket" }] },
  pharmacy:    { emoji: "💊", label: "Pharmacy",           filters: [{ amenity: "pharmacy" }] },
  transit:     { emoji: "🚉", label: "Transit Stop",      filters: [{ railway: "station" }, { public_transport: "stop_position" }, { highway: "bus_stop" }] },
  ev_charging: { emoji: "⚡", label: "EV Charging",       filters: [{ amenity: "charging_station" }] },
};

// ---------------------------------------------------------------------------
// Overpass types + helpers (internal)
// ---------------------------------------------------------------------------

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements: OverpassElement[] };

function getCoords(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
    return { lat: el.lat, lon: el.lon };
  }
  return el.center ?? null;
}

function classifyElement(tags: Record<string, string>): ServiceCategory | null {
  for (const [cat, def] of Object.entries(SERVICE_DEFS) as [ServiceCategory, ServiceDef][]) {
    for (const filter of def.filters) {
      if (Object.entries(filter).every(([k, v]) => tags[k] === v)) return cat;
    }
  }
  return null;
}

function buildOverpassQuery(lat: number, lon: number, radiusM: number): string {
  const around = `around:${radiusM},${lat},${lon}`;
  const lines: string[] = [];
  for (const def of Object.values(SERVICE_DEFS)) {
    for (const filter of def.filters) {
      const tags = Object.entries(filter).map(([k, v]) => `["${k}"="${v}"]`).join("");
      lines.push(`  node${tags}(${around});`);
      lines.push(`  way${tags}(${around});`);
    }
  }
  return `[out:json][timeout:25];\n(\n${lines.join("\n")}\n);\nout center;`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchNearbyServices(lat: number, lon: number): Promise<ServiceGroup[]> {
  const query = buildOverpassQuery(lat, lon, 5000);
  const url = "https://overpass-api.de/api/interpreter";
  console.log("[Overpass] Fetching services at", lat, lon);
  console.log("[Overpass] Query:\n", query);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!res.ok) throw new Error(`Overpass API returned HTTP ${res.status}`);

  const data: OverpassResponse = await res.json();
  console.log("[Overpass] Received", data.elements.length, "elements");

  const buckets = new Map<ServiceCategory, NearbyServiceItem[]>();
  for (const el of data.elements) {
    const coords = getCoords(el);
    if (!coords) continue;
    const tags = el.tags ?? {};
    const cat = classifyElement(tags);
    if (!cat) continue;
    const distanceKm = haversineKm(lat, lon, coords.lat, coords.lon);
    const list = buckets.get(cat) ?? [];
    list.push({ id: el.id, name: tags.name ?? SERVICE_DEFS[cat].label, lat: coords.lat, lon: coords.lon, distanceKm });
    buckets.set(cat, list);
  }

  return (Object.keys(SERVICE_DEFS) as ServiceCategory[]).map((cat) => {
    const items = (buckets.get(cat) ?? []).sort((a, b) => a.distanceKm - b.distanceKm);
    return { category: cat, emoji: SERVICE_DEFS[cat].emoji, label: SERVICE_DEFS[cat].label, nearest: items[0] ?? null };
  });
}
