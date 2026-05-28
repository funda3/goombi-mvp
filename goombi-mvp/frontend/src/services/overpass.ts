import { api } from "./api";
import type { NearbyServiceItem, ServiceCategory, ServiceGroup } from "../types/services";

const VALID_CATEGORIES = new Set<ServiceCategory>([
  "gym",
  "shopping",
  "fuel",
  "hospital",
  "clinic",
  "police",
  "restaurant",
  "atm",
  "supermarket",
  "pharmacy",
  "transit",
  "ev_charging",
]);

function isNearbyServiceItem(value: unknown): value is NearbyServiceItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.lat === "number" &&
    typeof item.lon === "number" &&
    typeof item.distanceKm === "number"
  );
}

function normalizeServiceGroups(value: unknown): ServiceGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: ServiceGroup[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const group = raw as Record<string, unknown>;
    if (
      typeof group.category !== "string" ||
      !VALID_CATEGORIES.has(group.category as ServiceCategory) ||
      typeof group.emoji !== "string" ||
      typeof group.label !== "string"
    ) {
      continue;
    }
    groups.push({
      category: group.category as ServiceCategory,
      emoji: group.emoji,
      label: group.label,
      nearest: isNearbyServiceItem(group.nearest) ? group.nearest : null,
    });
  }
  return groups;
}

export async function fetchNearbyServices(lat: number, lon: number): Promise<ServiceGroup[]> {
  try {
    const payload = await api.nearbyServices(lat, lon);
    if (!payload || payload.status === "fallback") {
      throw new Error("Nearby services unavailable.");
    }
    return normalizeServiceGroups(payload.services);
  } catch {
    throw new Error("Nearby services unavailable.");
  }
}
