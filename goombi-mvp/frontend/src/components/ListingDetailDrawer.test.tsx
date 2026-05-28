import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { Listing } from "../types/listing";
import { ListingDetailDrawer } from "./ListingDetailDrawer";

// ── Mock heavy/external dependencies ─────────────────────────────────────────
vi.mock("../hooks/useIsMobile", () => ({ useIsMobile: () => false }));
vi.mock("./PhotoCarousel", () => ({ PhotoCarousel: () => <div data-testid="photo-carousel" /> }));
vi.mock("./EnquiryFlow", () => ({ EnquiryFlow: () => <div data-testid="enquiry-flow" /> }));
vi.mock("./BookingEnquiryModal", () => ({ BookingEnquiryModal: () => <div data-testid="booking-modal" /> }));
vi.mock("./NearbyListings", () => ({ NearbyListings: () => <div data-testid="nearby-listings" /> }));
vi.mock("./NearbyServices", () => ({ NearbyServices: () => <div data-testid="nearby-services" /> }));

// ── Base listing factory ──────────────────────────────────────────────────────
const base: Listing = {
  id: "test-1",
  name: "Test Place",
  category: "guesthouse",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "1 Test Street",
  latitude: -26.05,
  longitude: 28.02,
  price_per_night: 0,
  max_guests: null,
  rooms: null,
  description: "A test listing.",
  amenities: [],
  photos: [],
  owner_name: "",
  owner_phone: "",
  verified_status: false,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
};

function renderDrawer(listing: Listing) {
  return render(<ListingDetailDrawer listing={listing} onClose={() => undefined} />);
}

// ── Accommodation ─────────────────────────────────────────────────────────────
test("accommodation: shows rooms and guest count when present", () => {
  renderDrawer({ ...base, listing_type: "accommodation", max_guests: 4, rooms: 2 });
  expect(screen.getByText(/up to 4 guests in 2 rooms/i)).toBeInTheDocument();
});

test("accommodation: does not show rooms line when rooms/max_guests are null", () => {
  renderDrawer({ ...base, listing_type: "accommodation", max_guests: null, rooms: null });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

// ── Restaurant ────────────────────────────────────────────────────────────────
test("restaurant: does not show rooms or guest count", () => {
  renderDrawer({
    ...base,
    listing_type: "restaurant",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

test("restaurant: shows cuisine/type when provider_type is set", () => {
  renderDrawer({
    ...base,
    listing_type: "restaurant",
    category: "restaurant",
    provider_type: "Fine dining",
    cuisine_tags: ["Contemporary", "South African"],
    price_band_goombi: "$$$",
    description_goombi: "Provider-approved Goombi restaurant marker.",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText(/Fine dining/)).toBeInTheDocument();
  expect(screen.getByText(/Contemporary, South African/)).toBeInTheDocument();
  expect(screen.getByText(/Price band:/)).toBeInTheDocument();
  expect(screen.getByText("Provider-approved Goombi restaurant marker.")).toBeInTheDocument();
  expect(screen.queryByText(/TripAdvisor/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/reviews/i)).not.toBeInTheDocument();
});

// ── Transport node ────────────────────────────────────────────────────────────
test("transport_node: does not show rooms or guest count", () => {
  renderDrawer({
    ...base,
    listing_type: "transport_node",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

test("transport_node: shows node type when provider_type is set", () => {
  renderDrawer({
    ...base,
    listing_type: "transport_node",
    category: "accommodation",
    provider_type: "Gautrain Station",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText("Gautrain Station")).toBeInTheDocument();
});

// ── Estate living zone ────────────────────────────────────────────────────────
test("estate_living_zone: does not show rooms or guest count", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

test("estate_living_zone: shows estate_type badge when present", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    estate_type: "Integrated Lifestyle Estate",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText("Integrated Lifestyle Estate")).toBeInTheDocument();
});

test("estate_living_zone: shows lifestyle summary when present", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    lifestyle_summary: "Live-work-play environment with 24-hour security.",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText("Live-work-play environment with 24-hour security.")).toBeInTheDocument();
});

test("estate_living_zone: does not show relocation-specific header", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    lifestyle_summary: "Parkland residence.",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/relocation summary/i)).not.toBeInTheDocument();
});

test("estate_living_zone: shows category label as Estate Living", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  // "Estate Living" appears as both category label and layer badge — confirm at least one is present
  expect(screen.getAllByText("Estate Living").length).toBeGreaterThan(0);
});

test("estate_living_zone: shows province in location line", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    province: "Western Cape",
    city: "Paarl",
    suburb: "Val de Vie",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText(/Western Cape/)).toBeInTheDocument();
});

test("estate_living_zone: does not show blank region/province", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    province: "Gauteng",
    city: "Midrand",
    suburb: "Waterfall",
    max_guests: null,
    rooms: null,
  });
  // Province should be present, not blank
  expect(screen.getByText(/Gauteng/)).toBeInTheDocument();
});

test("estate_living_zone: does not show buy/purchase/tour/viewing language", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/buy property/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/make offer/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/book viewing/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/estate tour/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/request tour/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/investment/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/mortgage/i)).not.toBeInTheDocument();
});

test("estate_living_zone: shows website button when website_url is set", () => {
  renderDrawer({
    ...base,
    listing_type: "estate_living_zone",
    category: "accommodation",
    website_url: "https://www.valdevie.co.za",
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText("Open Website")).toBeInTheDocument();
});

// ── Event space ───────────────────────────────────────────────────────────────
test("event_space: does not show rooms or guest count", () => {
  renderDrawer({
    ...base,
    listing_type: "event_space",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

test("event_space: shows capacity when present", () => {
  renderDrawer({
    ...base,
    listing_type: "event_space",
    category: "accommodation",
    capacity: 500,
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText(/capacity 500/i)).toBeInTheDocument();
});

// ── Tourism experience ────────────────────────────────────────────────────────
test("tourism_experience: does not show rooms or guest count", () => {
  renderDrawer({
    ...base,
    listing_type: "tourism_experience",
    category: "accommodation",
    max_guests: null,
    rooms: null,
  });
  expect(screen.queryByText(/rooms/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/guests in/i)).not.toBeInTheDocument();
});

test("tourism_experience: shows capacity as guest limit when present", () => {
  renderDrawer({
    ...base,
    listing_type: "tourism_experience",
    category: "accommodation",
    capacity: 20,
    max_guests: null,
    rooms: null,
  });
  expect(screen.getByText(/up to 20 guests/i)).toBeInTheDocument();
});
