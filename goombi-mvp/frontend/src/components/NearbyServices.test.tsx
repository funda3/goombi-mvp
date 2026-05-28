import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { Listing } from "../types/listing";
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
  mockFetchNearbyServices.mockResolvedValue([]);

  render(<NearbyServices listing={listing} />);
  fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));

  expect(screen.getByText("Loading nearby services...")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("No nearby services found.")).toBeInTheDocument());
});

test("shows graceful fallback error message and never shows raw fetch text", async () => {
  mockFetchNearbyServices.mockRejectedValue(new Error("Failed to fetch"));

  render(<NearbyServices listing={listing} />);
  fireEvent.click(screen.getByRole("button", { name: /Nearby Services/i }));

  await waitFor(() => expect(screen.getByText("Nearby services unavailable.")).toBeInTheDocument());
  expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
});
