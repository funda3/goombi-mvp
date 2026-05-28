import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("./api", () => ({
  api: {
    nearbyServices: vi.fn(),
  },
}));

import { api } from "./api";
import { fetchNearbyServices } from "./overpass";

const mockNearbyServices = api.nearbyServices as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockNearbyServices.mockReset();
});

describe("fetchNearbyServices", () => {
  test("returns deterministic fallback when API fails and location hints exist", async () => {
    mockNearbyServices.mockRejectedValue(new Error("network error"));

    const result = await fetchNearbyServices({
      lat: -26.1,
      lon: 28.05,
      province: "Gauteng",
      city: "Johannesburg",
      suburb: "Bryanston",
    });

    expect(result.status).toBe("fallback");
    expect(result.message).toBe("Demo nearby services shown");
    expect(result.services.length).toBeGreaterThanOrEqual(4);
    expect(result.services.length).toBeLessThanOrEqual(8);
    expect(result.services.every((group) => group.nearest !== null)).toBe(true);
    expect(result.services[0].nearest?.source).toBe("fallback");
    expect(result.services[0].nearest?.isFallback).toBe(true);
    expect(result.services[0].nearest?.badgeLabel).toBe("Fallback estimate");
  });

  test("returns empty when no coordinates and no location hints exist", async () => {
    const result = await fetchNearbyServices({});

    expect(result.status).toBe("empty");
    expect(result.message).toBe("Nearby services require listing coordinates.");
    expect(result.services).toEqual([]);
    expect(mockNearbyServices).not.toHaveBeenCalled();
  });

  test("converts malformed/empty live payload into fallback", async () => {
    mockNearbyServices.mockResolvedValue({
      status: "live",
      message: "Live nearby services",
      services: [],
    });

    const result = await fetchNearbyServices({
      lat: -29.9,
      lon: 31,
      province: "KwaZulu-Natal",
      city: "Durban",
      suburb: "Umhlanga",
    });

    expect(result.status).toBe("fallback");
    expect(result.message).toBe("Demo nearby services shown");
    expect(result.services.length).toBeGreaterThanOrEqual(4);
  });
});
