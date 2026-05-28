import { api } from "./api";
import { buildDemoNearbyServiceGroups, hasLocationHint, type NearbyLookupContext } from "./nearbyFallback";
import type { NearbyServiceItem, NearbyServicesResult, ServiceCategory, ServiceGroup } from "../types/services";

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
  "workspace",
  "attraction",
  "parking",
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

function emptyResult(message = "Nearby services require listing coordinates."): NearbyServicesResult {
  return { status: "empty", message, services: [] };
}

function fallbackResult(context: NearbyLookupContext): NearbyServicesResult {
  const services = buildDemoNearbyServiceGroups(context);
  if (services.length > 0) {
    return {
      status: "fallback",
      message: "Demo nearby services shown",
      services,
    };
  }
  return emptyResult();
}

export async function fetchNearbyServices(context: NearbyLookupContext): Promise<NearbyServicesResult> {
  if (!hasLocationHint(context)) {
    return emptyResult();
  }

  try {
    const payload = await api.nearbyServices(context);
    if (!payload || typeof payload !== "object") {
      return fallbackResult(context);
    }

    const status = payload.status;
    const message = typeof payload.message === "string" && payload.message.trim()
      ? payload.message
      : status === "live"
        ? "Live nearby services"
        : status === "fallback"
          ? "Demo nearby services shown"
          : "Nearby services require listing coordinates.";
    const services = normalizeServiceGroups(payload.services);
    const hasResults = services.some((group) => group.nearest !== null);

    if (status === "live" && hasResults) {
      return { status: "live", message, services };
    }

    if (status === "fallback") {
      if (hasResults) {
        return { status: "fallback", message: "Demo nearby services shown", services };
      }
      return fallbackResult(context);
    }

    if (status === "empty") {
      return hasLocationHint(context) ? fallbackResult(context) : emptyResult(message);
    }

    return hasResults
      ? { status: "live", message: "Live nearby services", services }
      : fallbackResult(context);
  } catch {
    return fallbackResult(context);
  }
}
