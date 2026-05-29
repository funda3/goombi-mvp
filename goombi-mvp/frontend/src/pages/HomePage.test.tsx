import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";
import type { NightlifeVenue } from "../types/nightlife";
import type { SelectedNearbyTarget } from "../types/nearbyTarget";
import { HomePage } from "./HomePage";

vi.mock("../components/BottomPanel", () => ({
  BottomPanel: ({ selectedTarget }: { selectedTarget?: SelectedNearbyTarget }) => (
    <section data-testid="nearby-services-panel">
      <div data-testid="nearby-target-id">{selectedTarget?.id ?? "none"}</div>
      <div data-testid="nearby-target-name">{selectedTarget?.name ?? "none"}</div>
      <div data-testid="nearby-target-source">{selectedTarget?.sourceType ?? "none"}</div>
      <div data-testid="nearby-target-coordinates">
        {selectedTarget ? `${selectedTarget.latitude},${selectedTarget.longitude}` : "none"}
      </div>
      {selectedTarget && (
        <div data-testid="nearby-service-card">
          <span data-testid="nearby-fallback-badge">Fallback estimate</span>
        </div>
      )}
    </section>
  ),
}));
vi.mock("../components/FilterPanel", () => ({
  FilterPanel: ({ filters, onChange }: { filters: { category: string; region?: string }; onChange: (filters: unknown) => void }) => (
    <div data-testid="filter-panel">
      <button type="button" onClick={() => onChange({ ...filters, category: "all" })}>All layers</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "restaurant" })}>Restaurants only</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "safari" })}>Safari only</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "events" })}>Events only</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "nightlife" })}>Nightlife only</button>
      <button type="button" onClick={() => onChange({ ...filters, region: "KwaZulu-Natal" })}>KwaZulu-Natal province</button>
    </div>
  ),
}));
vi.mock("../components/JourneyPlannerModal", () => ({ JourneyPlannerModal: () => null }));
vi.mock("../components/SearchBar", () => ({ SearchBar: () => <div data-testid="search-bar" /> }));
vi.mock("../components/MapCanvas", () => ({
  MapCanvas: ({
    listings,
    events,
    nightlife,
    selectedId,
    selectedEventId,
    selectedNightlifeId,
    onSelect,
    onSelectEvent,
    onSelectNightlife,
  }: {
    listings: Listing[];
    events?: EventRecord[];
    nightlife?: NightlifeVenue[];
    selectedId?: string;
    selectedEventId?: string;
    selectedNightlifeId?: string;
    onSelect: (listing: Listing) => void;
    onSelectEvent?: (event: EventRecord) => void;
    onSelectNightlife?: (venue: NightlifeVenue) => void;
  }) => (
    <div data-testid="map-canvas">
      <div data-testid="selected-marker">{selectedId ?? "none"}</div>
      <div data-testid="selected-event-marker">{selectedEventId ?? "none"}</div>
      <div data-testid="selected-nightlife-marker">{selectedNightlifeId ?? "none"}</div>
      {listings.map((listing) => (
        <button
          key={listing.id}
          data-testid={`marker-${listing.id}`}
          type="button"
          onClick={() => onSelect(listing)}
        >
          {listing.name}
        </button>
      ))}
      {(events ?? []).map((event) => (
        <button
          key={event.id}
          data-testid={`event-marker-${event.id}`}
          type="button"
          onClick={() => onSelectEvent?.(event)}
        >
          {event.name}
        </button>
      ))}
      {(nightlife ?? []).map((venue) => (
        <button
          key={venue.id}
          data-testid={`nightlife-marker-${venue.id}`}
          type="button"
          onClick={() => onSelectNightlife?.(venue)}
        >
          {venue.name}
        </button>
      ))}
    </div>
  ),
}));

// Keep ListingDetailDrawer lightweight for this integration-style marker/sheet behavior test.
vi.mock("../components/PhotoCarousel", () => ({ PhotoCarousel: () => <div data-testid="photo-carousel" /> }));
vi.mock("../components/EnquiryFlow", () => ({ EnquiryFlow: () => <div data-testid="enquiry-flow" /> }));
vi.mock("../components/BookingEnquiryModal", () => ({ BookingEnquiryModal: () => <div data-testid="booking-modal" /> }));
vi.mock("../components/NearbyListings", () => ({ NearbyListings: () => <div data-testid="nearby-listings" /> }));
vi.mock("../components/NearbyServices", () => ({ NearbyServices: () => <div data-testid="nearby-services" /> }));

vi.mock("../services/api", () => ({
  api: {
    listings: vi.fn(),
    events: vi.fn(),
    nightlife: vi.fn(),
    restaurantProspectsPublic: vi.fn(),
  },
}));

import { api } from "../services/api";

const mockListings = api.listings as ReturnType<typeof vi.fn>;
const mockEvents = api.events as ReturnType<typeof vi.fn>;
const mockNightlife = api.nightlife as ReturnType<typeof vi.fn>;
const mockRestaurantProspectsPublic = api.restaurantProspectsPublic as ReturnType<typeof vi.fn>;

const makeListing = (id: string, name: string): Listing => ({
  id,
  name,
  category: "guesthouse",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "1 Test Street",
  latitude: -26.05,
  longitude: 28.02,
  price_per_night: 1200,
  max_guests: 2,
  rooms: 1,
  description: "A test listing.",
  amenities: [],
  photos: [],
  owner_name: "Test Owner",
  owner_phone: "+27110000000",
  verified_status: true,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
});

const makeEvent = (id: string, name: string): EventRecord => ({
  id,
  name,
  category: "lifestyle",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Greyville",
  venue: "Greyville Racecourse",
  latitude: -29.8437,
  longitude: 31.0124,
  coordinate_accuracy: "venue",
  start_month: "July",
  end_month: "July",
  recurring_type: "annual",
  description: "Demo event",
  website_url: null,
  nearby_focus: "mixed",
  source_type: "events_guide_manual_seed",
  source_document: "Goombi_SA_Events_and_Markets_Guide(2).docx",
  verified_status: "guide_seed_phase_1",
});

const makeNightlife = (id: string, name: string): NightlifeVenue => ({
  id,
  name,
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Umhlanga",
  address: "Umhlanga nightlife strip",
  latitude: -29.7269,
  longitude: 31.0842,
  coordinate_accuracy: "approximate",
  nightlife_tier: "premium",
  music_focus: ["afrobeats", "house"],
  venue_type: "nightclub",
  description: "Demo nightlife venue",
  opening_pattern: "Fri-Sat nights",
  website_url: null,
  instagram_url: null,
  source_type: "manual_seed",
  source_note: "Seed",
  verified_status: "unverified_public_research",
});

beforeEach(() => {
  mockListings.mockReset();
  mockEvents.mockReset();
  mockNightlife.mockReset();
  mockRestaurantProspectsPublic.mockReset();
  mockEvents.mockResolvedValue([]);
  mockNightlife.mockResolvedValue([]);
  mockRestaurantProspectsPublic.mockResolvedValue({
    restaurants: [],
    counts: {
      visible_restaurant_demo_prospects: 0,
      source_records_total: 0,
    },
  });
});


test("marker click opens a single bottom sheet and selecting another marker updates it", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  const beta = makeListing("beta", "Beta Suites");
  mockListings.mockResolvedValue([alpha, beta]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());

  fireEvent.click(screen.getByTestId("marker-alpha"));

  expect(screen.getAllByTestId("listing-detail-drawer")).toHaveLength(1);
  expect(within(screen.getByTestId("listing-detail-drawer")).getByRole("heading", { name: "Alpha Lodge" })).toBeInTheDocument();
  expect(screen.getByTestId("selected-marker")).toHaveTextContent("alpha");

  fireEvent.click(screen.getByTestId("marker-beta"));

  expect(screen.getAllByTestId("listing-detail-drawer")).toHaveLength(1);
  expect(within(screen.getByTestId("listing-detail-drawer")).getByRole("heading", { name: "Beta Suites" })).toBeInTheDocument();
  expect(within(screen.getByTestId("listing-detail-drawer")).queryByRole("heading", { name: "Alpha Lodge" })).not.toBeInTheDocument();
  expect(screen.getByTestId("selected-marker")).toHaveTextContent("beta");
});

const makeRestaurant = (id: string, name: string, sourceType: Listing["source_type"] = "manual_public_source"): Listing => ({
  ...makeListing(id, name),
  category: "restaurant",
  listing_type: "restaurant",
  suburb: "Sandton",
  max_guests: null,
  rooms: null,
  cuisine_tags: ["South African"],
  source_type: sourceType,
});

const makeSafari = (id: string, name: string): Listing => ({
  ...makeListing(id, name),
  category: "safari",
  listing_type: "safari",
  safari_type: "national_park",
  region: "Limpopo & Mpumalanga",
  province: "Limpopo",
  city: "Hoedspruit",
  suburb: "Kruger National Park",
  latitude: -24,
  longitude: 31.5,
  max_guests: null,
  rooms: null,
  price_per_night: 115,
  price_amount: 115,
  price_unit: "day_entry",
  tags: ["Big Five"],
});

const makePublicProspect = (id: string, name: string, suburb: string) => ({
  id,
  name,
  province: "Gauteng",
  city: "Johannesburg",
  suburb,
  cuisine_tags: ["Contemporary"],
  price_band: "$$",
  latitude: -26.1,
  longitude: 28.05,
  approval_status: "prospect_only",
  demo_visibility: true,
});

test("unapproved restaurant prospects are not rendered on the public map", async () => {
  mockListings.mockResolvedValue([
    makeListing("alpha", "Alpha Lodge"),
    makeRestaurant("restaurant-approved", "Approved Kitchen"),
    makeRestaurant("restaurant-manual-seed", "Old Manual Restaurant", "manual_seed"),
  ]);
  mockEvents.mockResolvedValue([]);
  mockNightlife.mockResolvedValue([]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());
  expect(screen.getByTestId("marker-restaurant-approved")).toBeInTheDocument();
  expect(screen.queryByTestId("marker-restaurant-manual-seed")).not.toBeInTheDocument();
  expect(screen.queryByText("Prospect Kitchen")).not.toBeInTheDocument();
  expect(mockListings).toHaveBeenCalledTimes(1);
});

test("restaurant layer renders only approved restaurant public markers", async () => {
  mockListings.mockResolvedValue([
    makeListing("alpha", "Alpha Lodge"),
    makeRestaurant("restaurant-approved", "Approved Kitchen"),
    makeRestaurant("restaurant-manual-seed", "Old Manual Restaurant", "manual_seed"),
  ]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Restaurants only" }));

  expect(screen.getByTestId("marker-restaurant-approved")).toBeInTheDocument();
  expect(screen.queryByTestId("marker-alpha")).not.toBeInTheDocument();
  expect(screen.queryByTestId("marker-restaurant-manual-seed")).not.toBeInTheDocument();
});

test("safari layer renders only safari listing markers", async () => {
  mockListings.mockResolvedValue([
    makeListing("alpha", "Alpha Lodge"),
    makeRestaurant("restaurant-approved", "Approved Kitchen"),
    makeSafari("safari-kruger-national-park-01", "Kruger National Park"),
  ]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Safari only" }));

  expect(screen.getByTestId("marker-safari-kruger-national-park-01")).toBeInTheDocument();
  expect(screen.queryByTestId("marker-alpha")).not.toBeInTheDocument();
  expect(screen.queryByTestId("marker-restaurant-approved")).not.toBeInTheDocument();
  expect(screen.queryByTestId("event-marker-event-kzn-durban-july")).not.toBeInTheDocument();
  expect(screen.queryByTestId("nightlife-marker-nightlife-kzn-origin")).not.toBeInTheDocument();
});

test("events layer still renders event markers", async () => {
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge"), makeRestaurant("restaurant-approved", "Approved Kitchen")]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Events only" }));

  expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument();
  expect(screen.queryByTestId("nightlife-marker-nightlife-kzn-origin")).not.toBeInTheDocument();
  expect(screen.queryByTestId("marker-restaurant-approved")).not.toBeInTheDocument();
});

test("all mode shows accommodation workspace events nightlife and restaurants", async () => {
  const workspace: Listing = {
    ...makeListing("workspace", "Sandton Workspace"),
    category: "workspace",
    listing_type: "workspace",
    provider_name: "Workspace Co",
    workspace_type: "coworking",
    pricing_status: "not_publicly_available",
    source_url: "https://example.com",
    source_note: "Seeded",
  };
  mockListings.mockResolvedValue([
    makeListing("alpha", "Alpha Lodge"),
    workspace,
    makeRestaurant("restaurant-approved", "Approved Kitchen"),
    makeSafari("safari-kruger-national-park-01", "Kruger National Park"),
  ]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());
  expect(screen.getByTestId("marker-workspace")).toBeInTheDocument();
  expect(screen.getByTestId("marker-restaurant-approved")).toBeInTheDocument();
  expect(screen.getByTestId("marker-safari-kruger-national-park-01")).toBeInTheDocument();
  expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument();
  expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument();
});

test("clicking each marker family updates the shared nearby services target", async () => {
  const workspace: Listing = {
    ...makeListing("workspace", "Sandton Workspace"),
    category: "workspace",
    listing_type: "workspace",
    provider_name: "Workspace Co",
    workspace_type: "coworking",
    pricing_status: "not_publicly_available",
    source_url: "https://example.com",
    source_note: "Seeded",
    latitude: -26.1,
    longitude: 28.05,
  };
  const restaurant = {
    ...makeRestaurant("restaurant-approved", "Approved Kitchen"),
    latitude: -26.11,
    longitude: 28.06,
  };
  const safari = makeSafari("safari-kruger-national-park-01", "Kruger National Park");
  const event = makeEvent("event-kzn-durban-july", "Durban July");
  const venue = makeNightlife("nightlife-kzn-origin", "Origin Nightclub");
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge"), workspace, restaurant, safari]);
  mockEvents.mockResolvedValue([event]);
  mockNightlife.mockResolvedValue([venue]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());

  fireEvent.click(screen.getByTestId("marker-alpha"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Alpha Lodge");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("listing");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-26.05,28.02");
  expect(screen.getByTestId("nearby-fallback-badge")).toHaveTextContent("Fallback estimate");

  fireEvent.click(screen.getByTestId("marker-workspace"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Sandton Workspace");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("listing");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-26.1,28.05");

  fireEvent.click(screen.getByTestId("marker-restaurant-approved"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Approved Kitchen");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("restaurant");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-26.11,28.06");

  fireEvent.click(screen.getByTestId("marker-safari-kruger-national-park-01"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Kruger National Park");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("listing");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-24,31.5");

  fireEvent.click(screen.getByTestId("event-marker-event-kzn-durban-july"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Durban July");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("event");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-29.8437,31.0124");

  fireEvent.click(screen.getByTestId("nightlife-marker-nightlife-kzn-origin"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Origin Nightclub");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("nightlife");
  expect(screen.getByTestId("nearby-target-coordinates")).toHaveTextContent("-29.7269,31.0842");
});

test("nightlife near me floating overlay is not rendered while nightlife markers remain", async () => {
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument());
  expect(screen.queryByText(/nightlife near me/i)).not.toBeInTheDocument();
  expect(screen.queryByText("South Africa")).not.toBeInTheDocument();
});

test("events nearby floating overlay is not rendered while event markers remain", async () => {
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge")]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument());
  expect(screen.queryByText(/what'?s happening nearby/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/happening nearby/i)).not.toBeInTheDocument();
});

test("floating nearby overlays stay removed across province and layer changes", async () => {
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge")]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument());
  expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument();
  expect(screen.getByTestId("nearby-services-panel")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "KwaZulu-Natal province" }));
  fireEvent.click(screen.getByRole("button", { name: "Events only" }));

  expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("event-marker-event-kzn-durban-july"));
  expect(screen.getByTestId("nearby-fallback-badge")).toHaveTextContent("Fallback estimate");
  expect(screen.queryByText(/what'?s happening nearby/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/happening nearby/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/nightlife near me/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Nightlife only" }));

  expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument();
  expect(screen.queryByText(/what'?s happening nearby/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/happening nearby/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/nightlife near me/i)).not.toBeInTheDocument();
  expect(screen.getByTestId("nearby-services-panel")).toBeInTheDocument();
});

test("public restaurant prospects render as demo-safe map markers", async () => {
  mockListings.mockResolvedValue([makeListing("alpha", "Alpha Lodge")]);
  mockRestaurantProspectsPublic.mockResolvedValue({
    restaurants: [
      makePublicProspect("prospect-1", "Prospect One", "Sandton"),
      makePublicProspect("prospect-2", "Prospect Two", "Rosebank"),
    ],
    counts: {
      visible_restaurant_demo_prospects: 2,
      source_records_total: 2,
    },
  });

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-demo-prospect-prospect-1")).toBeInTheDocument());
  expect(screen.getByTestId("marker-demo-prospect-prospect-2")).toBeInTheDocument();
  expect(mockRestaurantProspectsPublic).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Restaurants only" }));
  expect(screen.getByTestId("marker-demo-prospect-prospect-1")).toBeInTheDocument();
  expect(screen.getByTestId("marker-demo-prospect-prospect-2")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("marker-demo-prospect-prospect-1"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Prospect One");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("restaurant");
  expect(screen.getByTestId("nearby-fallback-badge")).toHaveTextContent("Fallback estimate");
});

test("restaurants mode renders 233 restaurant markers including 230 demo prospects", async () => {
  const seedRestaurants = [
    makeRestaurant("restaurant-approved-1", "Approved Kitchen 1"),
    makeRestaurant("restaurant-approved-2", "Approved Kitchen 2"),
    makeRestaurant("restaurant-approved-3", "Approved Kitchen 3"),
  ];
  const accommodation = makeListing("alpha", "Alpha Lodge");
  const safari = makeSafari("safari-kruger-national-park-01", "Kruger National Park");

  const prospects = Array.from({ length: 230 }, (_, index) =>
    makePublicProspect(
      `prospect-${index + 1}`,
      `Prospect ${index + 1}`,
      `Suburb ${index + 1}`,
    ),
  );

  mockListings.mockResolvedValue([accommodation, safari, ...seedRestaurants]);
  mockRestaurantProspectsPublic.mockResolvedValue({
    restaurants: prospects,
    counts: {
      visible_restaurant_demo_prospects: 230,
      source_records_total: 230,
    },
  });

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-demo-prospect-prospect-230")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: "Restaurants only" }));

  const mapCanvas = screen.getByTestId("map-canvas");
  const restaurantMarkers = within(mapCanvas)
    .getAllByRole("button")
    .filter((node) => node.getAttribute("data-testid")?.startsWith("marker-"));
  expect(restaurantMarkers).toHaveLength(233);

  fireEvent.click(screen.getByRole("button", { name: "Safari only" }));
  expect(screen.queryByTestId("marker-demo-prospect-prospect-1")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "All layers" }));
  expect(screen.queryByTestId("marker-demo-prospect-prospect-1")).toBeInTheDocument();
  expect(screen.queryByTestId("marker-alpha")).toBeInTheDocument();
  expect(screen.queryByTestId("marker-safari-kruger-national-park-01")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("marker-demo-prospect-prospect-1"));
  expect(screen.getByTestId("nearby-target-name")).toHaveTextContent("Prospect 1");
  expect(screen.getByTestId("nearby-target-source")).toHaveTextContent("restaurant");
});

test("close button hides the bottom sheet and clears marker selection", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  mockListings.mockResolvedValue([alpha]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());

  fireEvent.click(screen.getByTestId("marker-alpha"));
  expect(within(screen.getByTestId("listing-detail-drawer")).getByRole("heading", { name: "Alpha Lodge" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close detail" }));

  expect(within(screen.getByTestId("listing-detail-drawer")).queryByRole("heading", { name: "Alpha Lodge" })).not.toBeInTheDocument();
  expect(screen.getByTestId("selected-marker")).toHaveTextContent("none");
  expect(screen.getByTestId("nearby-target-id")).toHaveTextContent("none");
  expect(screen.getByTestId("listing-detail-drawer").className).toContain("translate-y-[110%]");
});

test("clicking an event marker opens event bottom sheet", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  const durbanJuly = makeEvent("event-kzn-durban-july", "Durban July");
  mockListings.mockResolvedValue([alpha]);
  mockEvents.mockResolvedValue([durbanJuly]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument());
  fireEvent.click(screen.getByTestId("event-marker-event-kzn-durban-july"));

  expect(screen.getByRole("heading", { name: "Durban July" })).toBeInTheDocument();
  expect(screen.getByTestId("selected-event-marker")).toHaveTextContent("event-kzn-durban-july");
});

test("event bottom sheet shows nearby accommodation/workspace records", async () => {
  const durbanStay = {
    ...makeListing("durban-stay", "Durban Stay"),
    province: "KwaZulu-Natal",
    city: "Durban",
    suburb: "Greyville",
    latitude: -29.844,
    longitude: 31.012,
  };
  const durbanWorkspace = {
    ...durbanStay,
    id: "durban-workspace",
    name: "Durban Workspace",
    category: "workspace" as const,
    provider_name: "Workspace Co",
    workspace_type: "coworking" as const,
    pricing_status: "not_publicly_available" as const,
    source_url: "https://example.com",
    source_note: "Seeded",
  };
  const durbanJuly = makeEvent("event-kzn-durban-july", "Durban July");

  mockListings.mockResolvedValue([durbanStay, durbanWorkspace]);
  mockEvents.mockResolvedValue([durbanJuly]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument());
  fireEvent.click(screen.getByTestId("event-marker-event-kzn-durban-july"));

  const sheet = screen.getByTestId("event-bottom-sheet");
  expect(within(sheet).getByText("Nearby Accommodation and Workspace")).toBeInTheDocument();
  expect(within(sheet).getByText("Durban Stay")).toBeInTheDocument();
  expect(within(sheet).getByText("Durban Workspace")).toBeInTheDocument();
});

test("clicking a nightlife marker opens nightlife bottom sheet", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  const venue = makeNightlife("nightlife-kzn-origin", "Origin Nightclub");
  mockListings.mockResolvedValue([alpha]);
  mockNightlife.mockResolvedValue([venue]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument());
  fireEvent.click(screen.getByTestId("nightlife-marker-nightlife-kzn-origin"));

  expect(screen.getByRole("heading", { name: "Origin Nightclub" })).toBeInTheDocument();
  expect(screen.getByTestId("selected-nightlife-marker")).toHaveTextContent("nightlife-kzn-origin");
});

test("nightlife bottom sheet shows nearby accommodation workspace and events", async () => {
  const nearbyStay = {
    ...makeListing("durban-stay", "Durban Stay"),
    province: "KwaZulu-Natal",
    city: "Durban",
    suburb: "Umhlanga",
    latitude: -29.727,
    longitude: 31.084,
  };
  const nearbyWorkspace = {
    ...nearbyStay,
    id: "durban-workspace",
    name: "Durban Workspace",
    category: "workspace" as const,
    provider_name: "Workspace Co",
    workspace_type: "coworking" as const,
    pricing_status: "not_publicly_available" as const,
    source_url: "https://example.com",
    source_note: "Seeded",
  };
  const nearbyEvent = {
    ...makeEvent("event-kzn-demo", "Durban After Dark"),
    city: "Durban",
    suburb: "Umhlanga",
    latitude: -29.7265,
    longitude: 31.0851,
  };
  const venue = makeNightlife("nightlife-kzn-origin", "Origin Nightclub");

  mockListings.mockResolvedValue([nearbyStay, nearbyWorkspace]);
  mockEvents.mockResolvedValue([nearbyEvent]);
  mockNightlife.mockResolvedValue([venue]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument());
  fireEvent.click(screen.getByTestId("nightlife-marker-nightlife-kzn-origin"));

  const sheet = screen.getByTestId("nightlife-bottom-sheet");
  expect(within(sheet).getByText("Accommodation within 5 km")).toBeInTheDocument();
  expect(within(sheet).getByText("Workspace within 5 km")).toBeInTheDocument();
  expect(within(sheet).getByText("Events within 10 km")).toBeInTheDocument();
  expect(within(sheet).getByText("Durban Stay")).toBeInTheDocument();
  expect(within(sheet).getByText("Durban Workspace")).toBeInTheDocument();
  expect(within(sheet).getByText("Durban After Dark")).toBeInTheDocument();
});

