import { defaultFilters, filterListings } from "./filterListings";
import type { Listing } from "../types/listing";

const baseListing: Listing = {
  id: "demo-1",
  name: "Demo Stay",
  category: "bnb",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "Demo address",
  latitude: -26.05,
  longitude: 28.02,
  price_per_night: 900,
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

test("filters listings by suburb, price, capacity, and verified status", () => {
  const result = filterListings(
    [
      baseListing,
      { ...baseListing, id: "demo-2", suburb: "Sandton", price_per_night: 1700, verified_status: false },
    ],
    { ...defaultFilters, suburb: "Bryanston", maxPrice: 1000, minGuests: 2, verifiedOnly: true },
  );

  expect(result).toEqual([baseListing]);
});

test("filters workspace records by category and workspace type", () => {
  const workspace: Listing = {
    ...baseListing,
    id: "workspace",
    name: "Sandton Boardroom",
    category: "workspace",
    provider_name: "Workshop17",
    workspace_type: "boardroom",
    pricing_status: "not_publicly_available",
    source_url: "https://example.com",
    source_note: "Public provider page.",
  };

  expect(
    filterListings([baseListing, workspace], {
      ...defaultFilters,
      category: "workspace",
      workspaceType: "boardroom",
    }),
  ).toEqual([workspace]);
});
