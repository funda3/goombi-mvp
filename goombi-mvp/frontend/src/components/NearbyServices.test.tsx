import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { Listing } from "../types/listing";
import type { NearbyServicesResult } from "../types/services";
import { NearbyServices } from "./NearbyServices";

vi.mock("../services/overpass", () => ({
  fetchNearbyServices: vi.fn(),
}));

import { fetchNearbyServices } from "../services/overpass";

const mockFetchNearbyServices = fetchNearbyServices as ReturnType<typeof vi.fn>;

const listing: Listing = {
  id: "listing-1",
  name: "Demo Stay",
  category: "guesthouse",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "1 Demo Street",
  latitude: -26.1,
  longitude: 28.05,
  price_per_night: 1200,
  max_guests: 2,
  rooms: 1,
  description: "Demo",
  amenities: [],
  photos: [],
  owner_name: "Owner",
  owner_phone: "+27110000000",
  verified_status: true,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
};

beforeEach(() => {
  mockFetchNearbyServices.mockReset();
});

test("shows loading and empty state copy", async () => {
  const payload: NearbyServicesResult = {
    status: "live",
    message: "Live nearby services",
    services: [],
  };
  mockFetchNearbyServices.mockResolvedValue(payload);

  render(<NearbyServices listing={listing} />);
  fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));

  expect(screen.getByText("Loading nearby services...")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("No nearby services found.")).toBeInTheDocument());
});

test("renders fallback service cards with demo badge and no unavailable message", async () => {
  const payload: NearbyServicesResult = {
    status: "fallback",
    message: "Demo nearby services shown",
    services: [
      {
        category: "restaurant",
        emoji: "Food",
        label: "Restaurant / Cafe",
        nearest: {
          id: 1,
          name: "Estimated cafe / food option",
          lat: -26.11,
          lon: 28.06,
          distanceKm: 1.2,
          source: "fallback",
          isFallback: true,
          badgeLabel: "Fallback estimate",
          reason: "External nearby service provider unavailable",
        },
      },
      {
        category: "pharmacy",
        emoji: "Health",
        label: "Pharmacy",
        nearest: {
          id: 2,
          name: "Estimated pharmacy / health service",
          lat: -26.12,
          lon: 28.05,
          distanceKm: 2.5,
          source: "fallback",
          isFallback: true,
          badgeLabel: "Fallback estimate",
          reason: "External nearby service provider unavailable",
        },
      },
    ],
  };
  mockFetchNearbyServices.mockResolvedValue(payload);

  render(<NearbyServices listing={listing} />);
  fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));

  await waitFor(() => expect(screen.getByText("Demo-safe nearby estimates")).toBeInTheDocument());
  expect(screen.getByTestId("nearby-services-panel")).toBeInTheDocument();
  expect(screen.getByText("Estimated cafe / food option")).toBeInTheDocument();
  expect(screen.getAllByTestId("nearby-service-card")).toHaveLength(2);
  expect(screen.getAllByTestId("nearby-fallback-badge").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Fallback estimate").length).toBeGreaterThan(0);
  expect(screen.getAllByText("External nearby service provider unavailable").length).toBeGreaterThan(0);
  expect(screen.queryByText("Nearby services unavailable.")).not.toBeInTheDocument();
  expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
});

test("shows coordinate-specific message when coordinates are missing", async () => {
  const payload: NearbyServicesResult = {
    status: "empty",
    message: "Nearby services require listing coordinates.",
    services: [],
  };
  mockFetchNearbyServices.mockResolvedValue(payload);

  const noLocationListing: Listing = {
    ...listing,
    province: "",
    city: "",
    suburb: "",
    latitude: Number.NaN,
    longitude: Number.NaN,
  };

  render(<NearbyServices listing={noLocationListing} />);
  fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));
  await waitFor(() => expect(screen.getByText("Nearby services require listing coordinates.")).toBeInTheDocument());
  expect(screen.queryByText("Nearby services unavailable.")).not.toBeInTheDocument();
});

test("renders without crashing across multiple listing types", async () => {
  const payload: NearbyServicesResult = {
    status: "fallback",
    message: "Demo nearby services shown",
    services: [
      {
        category: "atm",
        emoji: "ATM",
        label: "ATM / Bank",
        nearest: {
          id: 3,
          name: "Estimated retail / convenience option",
          lat: -26.1,
          lon: 28.05,
          distanceKm: 0.9,
          source: "fallback",
          isFallback: true,
          badgeLabel: "Fallback estimate",
          reason: "External nearby service provider unavailable",
        },
      },
    ],
  };
  mockFetchNearbyServices.mockResolvedValue(payload);

  const variants: Listing[] = [
    { ...listing, category: "guesthouse", listing_type: "accommodation", id: "stay" },
    { ...listing, category: "workspace", listing_type: "workspace", id: "work" },
    { ...listing, category: "restaurant", listing_type: "restaurant", id: "eat" },
    { ...listing, category: "guesthouse", listing_type: "event_space", id: "event" },
    { ...listing, category: "guesthouse", listing_type: "tourism_experience", id: "nightlife-safe" },
  ];

  for (const variant of variants) {
    const { unmount } = render(<NearbyServices listing={variant} />);
    fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));
    await waitFor(() => expect(screen.getByText("Demo-safe nearby estimates")).toBeInTheDocument());
    unmount();
  }
});
