import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";
import type { NightlifeVenue } from "../types/nightlife";
import { HomePage } from "./HomePage";

vi.mock("../components/BottomPanel", () => ({ BottomPanel: () => null }));
vi.mock("../components/FilterPanel", () => ({
  FilterPanel: ({ filters, onChange }: { filters: { category: string }; onChange: (filters: unknown) => void }) => (
    <div data-testid="filter-panel">
      <button type="button" onClick={() => onChange({ ...filters, category: "all" })}>All layers</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "restaurant" })}>Restaurants only</button>
      <button type="button" onClick={() => onChange({ ...filters, category: "events" })}>Events only</button>
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
  },
}));

import { api } from "../services/api";

const mockListings = api.listings as ReturnType<typeof vi.fn>;
const mockEvents = api.events as ReturnType<typeof vi.fn>;
const mockNightlife = api.nightlife as ReturnType<typeof vi.fn>;

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
  mockEvents.mockResolvedValue([]);
  mockNightlife.mockResolvedValue([]);
});

test("marker click opens a single bottom sheet and selecting another marker updates it", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  const beta = makeListing("beta", "Beta Suites");
  mockListings.mockResolvedValue([alpha, beta]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());

  fireEvent.click(screen.getByTestId("marker-alpha"));

  expect(screen.getAllByTestId("listing-bottom-sheet")).toHaveLength(1);
  expect(within(screen.getByTestId("listing-bottom-sheet")).getByRole("heading", { name: "Alpha Lodge" })).toBeInTheDocument();
  expect(screen.getByTestId("selected-marker")).toHaveTextContent("alpha");

  fireEvent.click(screen.getByTestId("marker-beta"));

  expect(screen.getAllByTestId("listing-bottom-sheet")).toHaveLength(1);
  expect(within(screen.getByTestId("listing-bottom-sheet")).getByRole("heading", { name: "Beta Suites" })).toBeInTheDocument();
  expect(within(screen.getByTestId("listing-bottom-sheet")).queryByRole("heading", { name: "Alpha Lodge" })).not.toBeInTheDocument();
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
  ]);
  mockEvents.mockResolvedValue([makeEvent("event-kzn-durban-july", "Durban July")]);
  mockNightlife.mockResolvedValue([makeNightlife("nightlife-kzn-origin", "Origin Nightclub")]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());
  expect(screen.getByTestId("marker-workspace")).toBeInTheDocument();
  expect(screen.getByTestId("marker-restaurant-approved")).toBeInTheDocument();
  expect(screen.getByTestId("event-marker-event-kzn-durban-july")).toBeInTheDocument();
  expect(screen.getByTestId("nightlife-marker-nightlife-kzn-origin")).toBeInTheDocument();
});

test("close button hides the bottom sheet and clears marker selection", async () => {
  const alpha = makeListing("alpha", "Alpha Lodge");
  mockListings.mockResolvedValue([alpha]);

  render(<HomePage />);

  await waitFor(() => expect(screen.getByTestId("marker-alpha")).toBeInTheDocument());

  fireEvent.click(screen.getByTestId("marker-alpha"));
  expect(within(screen.getByTestId("listing-bottom-sheet")).getByRole("heading", { name: "Alpha Lodge" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close detail" }));

  expect(within(screen.getByTestId("listing-bottom-sheet")).queryByRole("heading", { name: "Alpha Lodge" })).not.toBeInTheDocument();
  expect(screen.getByTestId("selected-marker")).toHaveTextContent("none");
  expect(screen.getByTestId("listing-bottom-sheet").className).toContain("translate-y-[110%]");
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
