import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import { AdminPage } from "./AdminPage";
import type { Listing } from "../types/listing";

// ── Mock the api service ──────────────────────────────────────────────────────
vi.mock("../services/api", () => ({
  api: {
    listings: vi.fn(),
    enquiries: vi.fn(),
    restaurantProspects: vi.fn(),
    createListing: vi.fn(),
  },
}));

import { api } from "../services/api";
const mockListings = api.listings as ReturnType<typeof vi.fn>;
const mockEnquiries = api.enquiries as ReturnType<typeof vi.fn>;
const mockRestaurantProspects = api.restaurantProspects as ReturnType<typeof vi.fn>;
const mockCreateListing = api.createListing as ReturnType<typeof vi.fn>;

// ── Listing factory ───────────────────────────────────────────────────────────
const makeListing = (id: string, name: string, province: string): Listing => ({
  id,
  name,
  category: "guesthouse",
  province,
  city: province === "Gauteng" ? "Johannesburg" : province === "Western Cape" ? "Cape Town" : "Durban",
  suburb: "Test Suburb",
  address: "1 Test Street",
  latitude: -26.05,
  longitude: 28.02,
  price_per_night: 1000,
  max_guests: 2,
  rooms: 1,
  description: "Test listing.",
  amenities: [],
  photos: [],
  owner_name: "Test Owner",
  owner_phone: "+27110000000",
  verified_status: false,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
});

const GP_LISTING = makeListing("gp-1", "Gauteng Stay", "Gauteng");
const WC_LISTING = makeListing("wc-1", "Cape Town Stay", "Western Cape");
const KZN_LISTING = makeListing("kzn-1", "Durban Stay", "KwaZulu-Natal");
const ALL_LISTINGS = [GP_LISTING, WC_LISTING, KZN_LISTING];

beforeEach(() => {
  mockListings.mockReset();
  mockEnquiries.mockReset();
  mockRestaurantProspects.mockReset();
  mockCreateListing.mockReset();
  mockRestaurantProspects.mockResolvedValue([]);
  mockCreateListing.mockResolvedValue({});
});

function setup() {
  mockListings.mockResolvedValue(ALL_LISTINGS);
  mockEnquiries.mockResolvedValue([]);
  mockRestaurantProspects.mockResolvedValue([]);
  mockCreateListing.mockResolvedValue({});
  render(<AdminPage />);
}

async function waitForTable() {
  await waitFor(() => expect(screen.getByText("Gauteng Stay")).toBeInTheDocument());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("renders the region filter dropdown", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("combobox", { name: "Region" })).toBeInTheDocument();
});

test("renders restaurant prospects as internal audit records and disables conversion until approved", async () => {
  mockListings.mockResolvedValue(ALL_LISTINGS);
  mockEnquiries.mockResolvedValue([]);
  mockRestaurantProspects.mockResolvedValue([
    {
      id: "prospect-1",
      name: "Prospect Kitchen",
      province: "KwaZulu-Natal",
      city: "Johannesburg",
      suburb: "Umhlanga",
      cuisine_tags: ["Grill"],
      price_band: "$$",
      source_document: "Goombi_TA_Gauteng_Restaurants.docx",
      source_type: "restaurant_audit_seed",
      audit_status: "prospect_only",
      approval_status: "prospect_only",
      public_website_url: "",
      public_contact_url: "",
      notes_internal: "Internal only.",
      latitude: -26.1,
      longitude: 28.05,
      coordinate_accuracy: "city_or_suburb_centroid_estimate",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
    },
  ]);
  render(<AdminPage />);

  await waitFor(() => expect(screen.getByText("Prospect Kitchen")).toBeInTheDocument());
  expect(screen.getByText("KZN restaurant audit seed completed — records remain internal until provider approval.")).toBeInTheDocument();
  expect(screen.getAllByText("KwaZulu-Natal").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Convert to public restaurant marker" })).toBeDisabled();
});

test("restaurant prospect province filter shows KwaZulu-Natal records", async () => {
  mockListings.mockResolvedValue(ALL_LISTINGS);
  mockEnquiries.mockResolvedValue([]);
  mockRestaurantProspects.mockResolvedValue([
    {
      id: "prospect-kzn",
      name: "KZN Prospect Kitchen",
      province: "KwaZulu-Natal",
      city: "Durban",
      suburb: "Durban",
      cuisine_tags: ["Seafood"],
      price_band: "RR",
      source_document: "KZN Restaurant Audit Seed",
      source_type: "restaurant_audit_seed",
      audit_status: "prospect_only",
      approval_status: "prospect_only",
      public_website_url: "",
      public_contact_url: "",
      notes_internal: "Internal only.",
      latitude: -29.8587,
      longitude: 31.0218,
      coordinate_accuracy: "approximate",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
    },
    {
      id: "prospect-gp",
      name: "Gauteng Prospect Kitchen",
      province: "Gauteng",
      city: "Johannesburg",
      suburb: "Sandton",
      cuisine_tags: ["Grill"],
      price_band: "RR",
      source_document: "Goombi_TA_Gauteng_Restaurants.docx",
      source_type: "restaurant_audit_seed",
      audit_status: "prospect_only",
      approval_status: "prospect_only",
      public_website_url: "",
      public_contact_url: "",
      notes_internal: "Internal only.",
      latitude: -26.1,
      longitude: 28.05,
      coordinate_accuracy: "city_or_suburb_centroid_estimate",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
    },
  ]);
  render(<AdminPage />);

  await waitFor(() => expect(screen.getByText("KZN Prospect Kitchen")).toBeInTheDocument());
  fireEvent.change(screen.getByRole("combobox", { name: "Province" }), { target: { value: "KwaZulu-Natal" } });

  expect(screen.getByText("KZN Prospect Kitchen")).toBeInTheDocument();
  expect(screen.queryByText("Gauteng Prospect Kitchen")).not.toBeInTheDocument();
});

test("approved restaurant prospects can be converted to public restaurant listings", async () => {
  mockListings.mockResolvedValue(ALL_LISTINGS);
  mockEnquiries.mockResolvedValue([]);
  mockRestaurantProspects.mockResolvedValue([
    {
      id: "prospect-2",
      name: "Approved Kitchen",
      province: "Western Cape",
      city: "Cape Town",
      suburb: "V&A Waterfront",
      cuisine_tags: ["Seafood"],
      price_band: "$$$",
      source_document: "Goombi_TA_WesternCape_Restaurants.docx",
      source_type: "restaurant_audit_seed",
      audit_status: "prospect_only",
      approval_status: "provider_approved",
      public_website_url: "https://example.com",
      public_contact_url: "https://example.com/contact",
      notes_internal: "Internal only.",
      latitude: -33.9,
      longitude: 18.42,
      coordinate_accuracy: "city_or_suburb_centroid_estimate",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
    },
  ]);
  mockCreateListing.mockResolvedValue({});
  render(<AdminPage />);

  await waitFor(() => expect(screen.getByText("Approved Kitchen")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Convert to public restaurant marker" }));

  await waitFor(() => expect(mockCreateListing).toHaveBeenCalled());
  expect(mockCreateListing.mock.calls[0][0]).toMatchObject({
    category: "restaurant",
    listing_type: "restaurant",
    source_type: "provider_approved",
    name: "Approved Kitchen",
  });
});

test("region dropdown has the correct options", async () => {
  setup();
  await waitForTable();
  const select = screen.getByRole("combobox", { name: "Region" });
  expect(select).toHaveDisplayValue("All regions");
  const options = screen.getAllByRole("option", { hidden: false });
  const optionValues = options.map((o) => (o as HTMLOptionElement).value);
  expect(optionValues).toContain("all");
  expect(optionValues).toContain("Gauteng");
  expect(optionValues).toContain("Western Cape");
  expect(optionValues).toContain("KwaZulu-Natal");
});

test("default state (all regions) shows all listings", async () => {
  setup();
  await waitForTable();
  expect(screen.getByText("Gauteng Stay")).toBeInTheDocument();
  expect(screen.getByText("Cape Town Stay")).toBeInTheDocument();
  expect(screen.getByText("Durban Stay")).toBeInTheDocument();
});

test("selecting Gauteng shows Gauteng listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  expect(screen.getByText("Gauteng Stay")).toBeInTheDocument();
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Durban Stay")).not.toBeInTheDocument();
});

test("selecting Western Cape shows Western Cape listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Western Cape" } });
  expect(screen.getByText("Cape Town Stay")).toBeInTheDocument();
  expect(screen.queryByText("Gauteng Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Durban Stay")).not.toBeInTheDocument();
});

test("selecting KwaZulu-Natal shows KZN listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "KwaZulu-Natal" } });
  expect(screen.getByText("Durban Stay")).toBeInTheDocument();
  expect(screen.queryByText("Gauteng Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
});

test("Province column renders for each listing row", async () => {
  setup();
  await waitForTable();
  expect(sortBtn(/Province/i)).toBeInTheDocument();
  // Province values appear in both the dropdown options and the table cells;
  // getAllByText confirms at least one of each is present.
  expect(screen.getAllByText("Gauteng").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Western Cape").length).toBeGreaterThan(0);
  expect(screen.getAllByText("KwaZulu-Natal").length).toBeGreaterThan(0);
});

test("empty state message renders when selected region has no listings", async () => {
  mockListings.mockResolvedValue([GP_LISTING]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Gauteng Stay")).toBeInTheDocument());
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Western Cape" } });
  expect(screen.getByText("No listings match the selected filters.")).toBeInTheDocument();
});

test("count label shows total when all regions selected", async () => {
  setup();
  await waitForTable();
  expect(screen.getByText("3 listings")).toBeInTheDocument();
});

test("count label shows filtered / total when a region is selected", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  expect(screen.getByText("1 / 3 listings")).toBeInTheDocument();
});

// ── GMB-01K: layer filter ─────────────────────────────────────────────────────

test("renders the layer filter dropdown", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("combobox", { name: "Layer" })).toBeInTheDocument();
});

test("layer dropdown has All layers and all 9 layer options", async () => {
  setup();
  await waitForTable();
  const select = screen.getByRole("combobox", { name: "Layer" }) as HTMLSelectElement;
  expect(select).toHaveDisplayValue("All layers");
  const values = Array.from(select.options).map((o) => o.value);
  expect(values).toContain("all");
  expect(values).toContain("accommodation");
  expect(values).toContain("workspace");
  expect(values).toContain("tourism_experience");
  expect(values).toContain("restaurant");
  expect(values).toContain("safari");
  expect(values).toContain("transport_node");
  expect(values).toContain("estate_living_zone");
  expect(values).toContain("event_space");
  expect(values).toContain("township");
  expect(select.options).toHaveLength(10); // "all" + 9 types
});

test("Layer column sort button renders in table header", async () => {
  setup();
  await waitForTable();
  expect(sortBtn(/Layer/i)).toBeInTheDocument();
});

test("selecting accommodation layer shows only accommodation listings", async () => {
  const accomListing = { ...GP_LISTING, id: "accom-1", name: "Accom Stay", listing_type: "accommodation" as const };
  const estateListing = { ...GP_LISTING, id: "estate-1", name: "Estate Zone", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  mockListings.mockResolvedValue([accomListing, estateListing]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Accom Stay")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "accommodation" } });
  expect(screen.getByText("Accom Stay")).toBeInTheDocument();
  expect(screen.queryByText("Estate Zone")).not.toBeInTheDocument();
});

test("selecting estate_living_zone layer shows only estate listings", async () => {
  const accomListing = { ...GP_LISTING, id: "accom-1", name: "Accom Stay", listing_type: "accommodation" as const };
  const estateListing = { ...GP_LISTING, id: "estate-1", name: "Estate Zone", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  mockListings.mockResolvedValue([accomListing, estateListing]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Accom Stay")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "estate_living_zone" } });
  expect(screen.getByText("Estate Zone")).toBeInTheDocument();
  expect(screen.queryByText("Accom Stay")).not.toBeInTheDocument();
});

test("layer and region filters combine: only matching listings shown", async () => {
  const gpEstate = { ...GP_LISTING, id: "gp-estate", name: "GP Estate", province: "Gauteng", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  const wcEstate = { ...WC_LISTING, id: "wc-estate", name: "WC Estate", province: "Western Cape", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  const gpStay = { ...GP_LISTING, id: "gp-stay", name: "GP Stay", province: "Gauteng", listing_type: "accommodation" as const };
  mockListings.mockResolvedValue([gpEstate, wcEstate, gpStay]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("GP Estate")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "estate_living_zone" } });

  expect(screen.getByText("GP Estate")).toBeInTheDocument();
  expect(screen.queryByText("WC Estate")).not.toBeInTheDocument();
  expect(screen.queryByText("GP Stay")).not.toBeInTheDocument();
});

test("empty state renders when layer filter matches no listings", async () => {
  setup(); // GP, WC, KZN — all accommodation (no listing_type set, defaults to accommodation)
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "event_space" } });
  expect(screen.getByText("No listings match the selected filters.")).toBeInTheDocument();
});

test("count shows filtered / total when layer filter is active", async () => {
  const accomListing = { ...GP_LISTING, id: "accom-1", name: "Accom Stay", listing_type: "accommodation" as const };
  const estateListing = { ...GP_LISTING, id: "estate-1", name: "Estate Zone", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  mockListings.mockResolvedValue([accomListing, estateListing]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Accom Stay")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "accommodation" } });
  expect(screen.getByText("1 / 2 listings")).toBeInTheDocument();
});

// ── GMB-01L: name search ──────────────────────────────────────────────────────

test("renders the name search input", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
});

test("typing a query shows only listings whose name contains the query (case-insensitive)", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "gauteng" } });
  expect(screen.getByText("Gauteng Stay")).toBeInTheDocument();
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Durban Stay")).not.toBeInTheDocument();
});

test("clearing the search restores all listings", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "gauteng" } });
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "" } });
  expect(screen.getByText("Cape Town Stay")).toBeInTheDocument();
  expect(screen.getByText("Durban Stay")).toBeInTheDocument();
});

test("search with no matches shows empty state", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "xyznotfound" } });
  expect(screen.getByText("No listings match the selected filters.")).toBeInTheDocument();
});

test("name search and region filter combine", async () => {
  setup(); // GP_LISTING="Gauteng Stay", WC_LISTING="Cape Town Stay", KZN_LISTING="Durban Stay"
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "cape" } });
  // "Cape Town Stay" is Western Cape, "Gauteng Stay" doesn't contain "cape" — nothing matches
  expect(screen.getByText("No listings match the selected filters.")).toBeInTheDocument();
});

test("name search and layer filter combine", async () => {
  const accomListing = { ...GP_LISTING, id: "accom-1", name: "Bryanston Stay", listing_type: "accommodation" as const };
  const estateListing = { ...GP_LISTING, id: "estate-1", name: "Bryanston Estate", listing_type: "estate_living_zone" as const, max_guests: null, rooms: null };
  mockListings.mockResolvedValue([accomListing, estateListing]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Bryanston Stay")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Layer" }), { target: { value: "estate_living_zone" } });
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "bryanston" } });
  expect(screen.getByText("Bryanston Estate")).toBeInTheDocument();
  expect(screen.queryByText("Bryanston Stay")).not.toBeInTheDocument();
});

test("count shows filtered / total when name query is active", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "gauteng" } });
  expect(screen.getByText("1 / 3 listings")).toBeInTheDocument();
});

// ── GMB-01M: sort controls ────────────────────────────────────────────────────

function rowOrder() {
  return screen.getAllByRole("row").slice(1).map((row) => (row as HTMLTableRowElement).cells[0].textContent ?? "");
}

function sortBtn(name: RegExp) {
  return within(screen.getByRole("table")).getByRole("button", { name });
}

test("Listing column header is a sort button defaulting to name asc", async () => {
  setup();
  await waitForTable();
  expect(sortBtn(/Listing/i)).toBeInTheDocument();
  // default sort is name asc — "Cape Town Stay" < "Durban Stay" < "Gauteng Stay"
  const order = rowOrder();
  expect(order).toEqual(["Cape Town Stay", "Durban Stay", "Gauteng Stay"]);
});

test("clicking Listing button a second time reverses to name desc", async () => {
  setup();
  await waitForTable();
  fireEvent.click(sortBtn(/Listing/i)); // already asc → goes desc
  const order = rowOrder();
  expect(order).toEqual(["Gauteng Stay", "Durban Stay", "Cape Town Stay"]);
});

test("clicking Province button sorts rows by province asc", async () => {
  setup();
  await waitForTable();
  // provinces: Gauteng, KwaZulu-Natal, Western Cape → asc alphabetical
  fireEvent.click(sortBtn(/Province/i));
  const order = rowOrder();
  expect(order[0]).toBe("Gauteng Stay");    // Gauteng first
  expect(order[2]).toBe("Cape Town Stay");  // Western Cape last
});

test("clicking Province button twice reverses province sort to desc", async () => {
  setup();
  await waitForTable();
  const btn = sortBtn(/Province/i);
  fireEvent.click(btn); // asc
  fireEvent.click(btn); // desc
  const order = rowOrder();
  expect(order[0]).toBe("Cape Town Stay");  // Western Cape first (desc)
  expect(order[2]).toBe("Gauteng Stay");    // Gauteng last
});

test("clicking Layer button sorts rows by layer label", async () => {
  const stays  = { ...GP_LISTING, id: "s1", name: "Alpha Stay", listing_type: "accommodation" as const };
  const eats   = { ...GP_LISTING, id: "e1", name: "Beta Eats", listing_type: "restaurant" as const, max_guests: null, rooms: null };
  const events = { ...GP_LISTING, id: "ev1", name: "Gamma Events", listing_type: "event_space" as const, max_guests: null, rooms: null };
  mockListings.mockResolvedValue([events, eats, stays]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Alpha Stay")).toBeInTheDocument());

  fireEvent.click(sortBtn(/Layer/i));
  const order = rowOrder();
  // displayCategory values: Accommodation, Event Space, Restaurant → asc alphabetical
  expect(order[0]).toBe("Alpha Stay");    // Accommodation
  expect(order[1]).toBe("Gamma Events"); // Event Space
  expect(order[2]).toBe("Beta Eats");    // Restaurant
});

test("sort persists after filter changes", async () => {
  setup();
  await waitForTable();
  fireEvent.click(sortBtn(/Listing/i)); // name desc
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  expect(rowOrder()).toEqual(["Gauteng Stay"]);
});

// ── GMB-01N: verified filter ──────────────────────────────────────────────────

const VERIFIED_LISTING   = { ...GP_LISTING, id: "v1", name: "Verified Stay",   verified_status: true  };
const UNVERIFIED_LISTING = { ...GP_LISTING, id: "u1", name: "Unverified Stay", verified_status: false };

async function setupVerified() {
  mockListings.mockResolvedValue([VERIFIED_LISTING, UNVERIFIED_LISTING]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Verified Stay")).toBeInTheDocument());
}

test("renders the verified filter dropdown", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("combobox", { name: "Verified" })).toBeInTheDocument();
});

test("verified dropdown has three options", async () => {
  setup();
  await waitForTable();
  const select = screen.getByRole("combobox", { name: "Verified" }) as HTMLSelectElement;
  expect(select).toHaveDisplayValue("All listings");
  const values = Array.from(select.options).map((o) => o.value);
  expect(values).toEqual(["all", "verified", "unverified"]);
});

test("default state shows both verified and unverified listings", async () => {
  await setupVerified();
  expect(screen.getByText("Verified Stay")).toBeInTheDocument();
  expect(screen.getByText("Unverified Stay")).toBeInTheDocument();
});

test("selecting verified shows only verified listings", async () => {
  await setupVerified();
  fireEvent.change(screen.getByRole("combobox", { name: "Verified" }), { target: { value: "verified" } });
  expect(screen.getByText("Verified Stay")).toBeInTheDocument();
  expect(screen.queryByText("Unverified Stay")).not.toBeInTheDocument();
});

test("selecting unverified shows only unverified listings", async () => {
  await setupVerified();
  fireEvent.change(screen.getByRole("combobox", { name: "Verified" }), { target: { value: "unverified" } });
  expect(screen.getByText("Unverified Stay")).toBeInTheDocument();
  expect(screen.queryByText("Verified Stay")).not.toBeInTheDocument();
});

test("verified filter composes with region filter", async () => {
  const gpVerified   = { ...GP_LISTING, id: "gp-v", name: "GP Verified",   province: "Gauteng",      verified_status: true  };
  const wcUnverified = { ...WC_LISTING, id: "wc-u", name: "WC Unverified", province: "Western Cape", verified_status: false };
  mockListings.mockResolvedValue([gpVerified, wcUnverified]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("GP Verified")).toBeInTheDocument());

  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Verified" }), { target: { value: "unverified" } });
  expect(screen.getByText("No listings match the selected filters.")).toBeInTheDocument();
});

test("verified filter composes with name search", async () => {
  await setupVerified();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "verified" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Verified" }), { target: { value: "unverified" } });
  expect(screen.getByText("Unverified Stay")).toBeInTheDocument();
  expect(screen.queryByText("Verified Stay")).not.toBeInTheDocument();
});

test("count shows filtered / total when verified filter is active", async () => {
  await setupVerified();
  fireEvent.change(screen.getByRole("combobox", { name: "Verified" }), { target: { value: "verified" } });
  expect(screen.getByText("1 / 2 listings")).toBeInTheDocument();
});
