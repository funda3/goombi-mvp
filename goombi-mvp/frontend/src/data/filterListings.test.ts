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

test("filters approved public restaurant listings by restaurant category", () => {
  const restaurant: Listing = {
    ...baseListing,
    id: "restaurant-approved",
    name: "Approved Kitchen",
    category: "restaurant",
    listing_type: "restaurant",
    max_guests: null,
    rooms: null,
    cuisine_tags: ["South African"],
    source_type: "provider_approved",
  };

  expect(
    filterListings([baseListing, restaurant], {
      ...defaultFilters,
      category: "restaurant",
    }),
  ).toEqual([restaurant]);
});

test("filters safari records by category and safari region", () => {
  const safari: Listing = {
    ...baseListing,
    id: "safari-kruger-national-park-01",
    name: "Kruger National Park",
    category: "safari",
    listing_type: "safari",
    safari_type: "national_park",
    region: "Limpopo & Mpumalanga",
    province: "Limpopo",
    city: "Hoedspruit",
    suburb: "Kruger National Park",
    max_guests: null,
    rooms: null,
    price_per_night: 115,
    price_amount: 115,
    price_unit: "day_entry",
    tags: ["Big Five", "national park"],
  };

  expect(
    filterListings([baseListing, safari], {
      ...defaultFilters,
      category: "safari",
      region: "Limpopo & Mpumalanga",
    }),
  ).toEqual([safari]);
});

test("excludes restaurant audit and unapproved seed records from public filters", () => {
  const approved: Listing = {
    ...baseListing,
    id: "restaurant-approved",
    name: "Approved Kitchen",
    category: "restaurant",
    listing_type: "restaurant",
    max_guests: null,
    rooms: null,
    cuisine_tags: ["South African"],
    source_type: "manual_public_source",
  };
  const auditSeed = {
    ...approved,
    id: "restaurant-audit",
    name: "Audit Prospect Kitchen",
    source_type: "restaurant_audit_seed",
  } as unknown as Listing;
  const oldManualSeed: Listing = {
    ...approved,
    id: "restaurant-manual-seed",
    name: "Old Manual Restaurant",
    source_type: "manual_seed",
  };

  expect(
    filterListings([approved, auditSeed, oldManualSeed], {
      ...defaultFilters,
      category: "restaurant",
    }),
  ).toEqual([approved]);
});

test("hiddenLayers hides listings of the specified layer type", () => {
  const tourismListing: Listing = {
    ...baseListing,
    id: "tour-1",
    name: "Soweto Tour",
    category: "accommodation",
    listing_type: "tourism_experience",
  };
  const restaurantListing: Listing = {
    ...baseListing,
    id: "rest-1",
    name: "Waterfront Eats",
    category: "restaurant",
    listing_type: "restaurant",
    source_type: "manual_public_source",
  };

  // Hide tourism_experience — only accommodation and restaurant should remain
  expect(
    filterListings([baseListing, tourismListing, restaurantListing], {
      ...defaultFilters,
      hiddenLayers: ["tourism_experience"],
    }),
  ).toEqual([baseListing, restaurantListing]);

  // Hide both accommodation and restaurant — only tourism stays
  expect(
    filterListings([baseListing, tourismListing, restaurantListing], {
      ...defaultFilters,
      hiddenLayers: ["accommodation", "restaurant"],
    }),
  ).toEqual([tourismListing]);
});

test("defaultFilters has empty hiddenLayers (all layers visible)", () => {
  expect(defaultFilters.hiddenLayers).toEqual([]);
});

test("empty hiddenLayers shows all listings", () => {
  const tourismListing: Listing = {
    ...baseListing,
    id: "tour-2",
    listing_type: "tourism_experience",
    category: "accommodation",
  };
  const result = filterListings([baseListing, tourismListing], {
    ...defaultFilters,
    hiddenLayers: [],
  });
  expect(result).toHaveLength(2);
});

// ── GMB-01D: guest filter must not drop non-stay listings ─────────────────────

test("minGuests filter does not remove restaurants with null max_guests", () => {
  const restaurant: Listing = {
    ...baseListing,
    id: "rest-null",
    name: "Open Kitchen",
    category: "restaurant",
    listing_type: "restaurant",
    source_type: "manual_public_source",
    max_guests: null,
    rooms: null,
  };
  const result = filterListings([baseListing, restaurant], {
    ...defaultFilters,
    minGuests: 2,
  });
  // restaurant should survive because minGuests only applies to accommodation
  expect(result.some((l) => l.id === "rest-null")).toBe(true);
});

test("minGuests filter does not remove transport_node with null max_guests", () => {
  const node: Listing = {
    ...baseListing,
    id: "transport-null",
    name: "Sandton Gautrain",
    category: "accommodation",
    listing_type: "transport_node",
    max_guests: null,
    rooms: null,
  };
  const result = filterListings([node], { ...defaultFilters, minGuests: 4 });
  expect(result).toHaveLength(1);
});

test("estate_living_zone records are excluded from public filters", () => {
  const estate: Listing = {
    ...baseListing,
    id: "estate-null",
    name: "Waterfall Estate",
    category: "accommodation",
    listing_type: "estate_living_zone",
    max_guests: null,
    rooms: null,
  };
  const result = filterListings([estate], { ...defaultFilters, minGuests: 3 });
  expect(result).toHaveLength(0);
});

test("minGuests still filters out accommodation listings below threshold", () => {
  const smallStay: Listing = { ...baseListing, id: "small", max_guests: 1 };
  const bigStay: Listing = { ...baseListing, id: "big", max_guests: 5 };
  const result = filterListings([smallStay, bigStay], { ...defaultFilters, minGuests: 3 });
  expect(result).toEqual([bigStay]);
});

// ── GMB-01I: province/region filter works for estate records ─────────────────

const makeEstate = (id: string, province: string): Listing => ({
  ...baseListing,
  id,
  name: `${province} Estate`,
  category: "accommodation",
  listing_type: "estate_living_zone",
  province,
  region: province,
  max_guests: null,
  rooms: null,
});

test("region filter excludes Gauteng estate records", () => {
  const gp = makeEstate("estate-gp", "Gauteng");
  const wc = makeEstate("estate-wc", "Western Cape");
  const kzn = makeEstate("estate-kzn", "KwaZulu-Natal");
  const result = filterListings([gp, wc, kzn], { ...defaultFilters, region: "Gauteng" });
  expect(result).toHaveLength(0);
});

test("region filter excludes Western Cape estate records", () => {
  const gp = makeEstate("estate-gp", "Gauteng");
  const wc = makeEstate("estate-wc", "Western Cape");
  const result = filterListings([gp, wc], { ...defaultFilters, region: "Western Cape" });
  expect(result).toHaveLength(0);
});

test("region filter excludes KwaZulu-Natal estate records", () => {
  const kzn = makeEstate("estate-kzn", "KwaZulu-Natal");
  const gp = makeEstate("estate-gp", "Gauteng");
  const result = filterListings([kzn, gp], { ...defaultFilters, region: "KwaZulu-Natal" });
  expect(result).toHaveLength(0);
});

test("region=all still excludes all estate records", () => {
  const gp = makeEstate("estate-gp", "Gauteng");
  const wc = makeEstate("estate-wc", "Western Cape");
  const kzn = makeEstate("estate-kzn", "KwaZulu-Natal");
  const result = filterListings([gp, wc, kzn], { ...defaultFilters, region: "all" });
  expect(result).toHaveLength(0);
});

test("estate records are excluded even when hidden-layers is empty", () => {
  const estate = makeEstate("estate-gp", "Gauteng");
  const result = filterListings([estate], { ...defaultFilters, hiddenLayers: [] });
  expect(result).toHaveLength(0);
});

test("estate records are excluded when estate_living_zone is in hiddenLayers", () => {
  const estate = makeEstate("estate-gp", "Gauteng");
  const result = filterListings([estate], { ...defaultFilters, hiddenLayers: ["estate_living_zone"] });
  expect(result).toHaveLength(0);
});
