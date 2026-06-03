import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";
import type { NightlifeVenue } from "../types/nightlife";
import { ALL_LISTING_TYPES } from "../types/listing";

// Stable mock map methods captured via vi.hoisted so they're available in the factory
const { mockSetView, mockFitBounds, mockFlyTo, mockMapState } = vi.hoisted(() => ({
  mockSetView: vi.fn(),
  mockFitBounds: vi.fn(),
  mockFlyTo: vi.fn(),
  mockMapState: { zoom: 11 },
}));

// react-leaflet requires a real DOM with dimensions; mock it for jsdom
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({
    children,
    eventHandlers,
    center,
    radius,
    pathOptions,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    center: [number, number];
    radius?: number;
    pathOptions?: { fillColor?: string };
  }) => (
    <button
      data-testid="circle-marker"
      aria-label={`Marker at ${center[0]},${center[1]}`}
      data-radius={radius}
      data-fill-color={pathOptions?.fillColor}
      data-stroke-color={(pathOptions as { color?: string } | undefined)?.color}
      onClick={eventHandlers?.click}
    >
      {children}
    </button>
  ),
  Polygon: ({
    children,
    eventHandlers,
    positions,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    positions: [number, number][];
  }) => (
    <button data-testid="workspace-marker" aria-label={`Workspace at ${positions[0][0]},${positions[0][1]}`} onClick={eventHandlers?.click}>
      {children}
    </button>
  ),
  Marker: ({
    children,
    eventHandlers,
    position,
    icon,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    position: [number, number];
    icon?: { options?: { html?: string } };
  }) => {
    const iconHtml = icon?.options?.html ?? "";
    const isCluster = iconHtml.includes("goombi-cluster-marker");
    const clusterFamily = iconHtml.match(/data-cluster-family="([^"]+)"/)?.[1] ?? "mixed";
    const clusterCount = iconHtml.match(/data-cluster-count="([^"]+)"/)?.[1] ?? "";
    const isSafari = iconHtml.includes("goombi-safari-lion-marker");
    const isEvent = iconHtml.includes("goombi-event-bold-marker");
    const isNightlife = iconHtml.includes("goombi-nightlife-bold-marker");
    const testId = isCluster ? "cluster-marker" : isSafari ? "safari-marker" : isEvent ? "event-marker" : isNightlife ? "nightlife-marker" : "workspace-marker";
    return (
      <button
        data-testid={testId}
        aria-label={`Marker at ${position[0]},${position[1]}`}
        data-icon-html={iconHtml}
        data-cluster-family={isCluster ? clusterFamily : undefined}
        data-cluster-count={isCluster ? clusterCount : undefined}
        onClick={eventHandlers?.click}
      >
        {children}
      </button>
    );
  },
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({
    setView: mockSetView,
    fitBounds: mockFitBounds,
    flyTo: mockFlyTo,
    getZoom: () => mockMapState.zoom,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

import { LeafletMap } from "./LeafletMap";

beforeEach(() => {
  mockSetView.mockClear();
  mockFitBounds.mockClear();
  mockFlyTo.mockClear();
  mockMapState.zoom = 11;
});

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: "test-1",
  name: "Test Listing",
  category: "guesthouse",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "1 Test Street",
  latitude: -26.0524,
  longitude: 28.0241,
  price_per_night: 1200,
  max_guests: 4,
  rooms: 2,
  description: "A test listing.",
  amenities: ["WiFi"],
  photos: [],
  owner_name: "Test Owner",
  owner_phone: "+27110000000",
  verified_status: true,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
  ...overrides,
});

const makeEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: "evt-1",
  name: "Durban July",
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
  description: "Horse racing and lifestyle event.",
  website_url: null,
  nearby_focus: "mixed",
  source_type: "events_guide_manual_seed",
  source_document: "Goombi_SA_Events_and_Markets_Guide(2).docx",
  verified_status: "guide_seed_phase_1",
  ...overrides,
});

const makeNightlife = (overrides: Partial<NightlifeVenue> = {}): NightlifeVenue => ({
  id: "night-1",
  name: "Origin Nightclub",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Umhlanga",
  address: "Umhlanga nightlife strip",
  latitude: -29.7269,
  longitude: 31.0842,
  coordinate_accuracy: "approximate",
  nightlife_tier: "premium",
  music_focus: ["house", "afrobeats"],
  venue_type: "nightclub",
  description: "Demo nightlife venue",
  opening_pattern: "Fri-Sat nights",
  website_url: null,
  instagram_url: null,
  source_type: "manual_seed",
  source_note: "Seed",
  verified_status: "unverified_public_research",
  ...overrides,
});

const makeDenseRestaurantListings = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeListing({
      id: `restaurant-${index}`,
      name: `Restaurant ${index}`,
      category: "restaurant",
      listing_type: "restaurant",
      cuisine_tags: ["Demo"],
      source_type: "demo_public_restaurant",
      latitude: -26.1 + index * 0.0002,
      longitude: 28.05 + index * 0.0002,
      max_guests: null,
      rooms: null,
    }),
  );

const makeDenseTownshipListings = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeListing({
      id: `township-${index}`,
      name: `Township Place ${index}`,
      category: "township",
      listing_type: "township",
      township_type: "guesthouse",
      latitude: -26.25 + index * 0.0002,
      longitude: 27.88 + index * 0.0002,
      max_guests: null,
      rooms: null,
    }),
  );

test("renders the map container and tile layer", () => {
  render(<LeafletMap listings={[]} onSelect={() => undefined} />);

  expect(screen.getByTestId("leaflet-map")).toBeInTheDocument();
  expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
});

test("renders a marker for each listing", () => {
  const listings = [makeListing({ id: "a", name: "Alpha" }), makeListing({ id: "b", name: "Beta" })];
  render(<LeafletMap listings={listings} onSelect={() => undefined} />);

  expect(screen.getAllByTestId("circle-marker")).toHaveLength(2);
  expect(screen.getByText("Alpha")).toBeInTheDocument();
  expect(screen.getByText("Beta")).toBeInTheDocument();
});

test("clicking a marker calls onSelect with the listing", () => {
  const listing = makeListing();
  const onSelect = vi.fn();
  render(<LeafletMap listings={[listing]} onSelect={onSelect} />);

  fireEvent.click(screen.getByTestId("circle-marker"));

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(listing);
});

test("renders Fit, SA, and JHB control buttons", () => {
  render(<LeafletMap listings={[makeListing()]} onSelect={() => undefined} />);

  expect(screen.getByRole("button", { name: "Fit to results" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "South Africa view" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Johannesburg North view" })).toBeInTheDocument();
});

test("Fit button is disabled when there are no listings", () => {
  render(<LeafletMap listings={[]} onSelect={() => undefined} />);

  expect(screen.getByRole("button", { name: "Fit to results" })).toBeDisabled();
});

test("SA button sets map view to South Africa coordinates", () => {
  render(<LeafletMap listings={[makeListing()]} onSelect={() => undefined} />);

  fireEvent.click(screen.getByRole("button", { name: "South Africa view" }));

  expect(mockSetView).toHaveBeenCalledWith([-30.5595, 22.9375], 5);
});

test("JHB button sets map view to Johannesburg North coordinates", () => {
  render(<LeafletMap listings={[makeListing()]} onSelect={() => undefined} />);

  fireEvent.click(screen.getByRole("button", { name: "Johannesburg North view" }));

  expect(mockSetView).toHaveBeenCalledWith([-26.1076, 28.0567], 11);
});

test("Fit button calls fitBounds with listing coordinates", () => {
  const listing = makeListing({ latitude: -26.05, longitude: 28.02 });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);

  fireEvent.click(screen.getByRole("button", { name: "Fit to results" }));

  expect(mockFitBounds).toHaveBeenCalledWith([[-26.05, 28.02]], { padding: [40, 40] });
});

test("renders square or diamond workspace markers", () => {
  render(
    <LeafletMap
      listings={[makeListing({ category: "workspace", workspace_type: "boardroom", provider_name: "TBE", pricing_status: "not_publicly_available", source_url: "https://example.com", source_note: "Public source." })]}
      onSelect={() => undefined}
    />,
  );

  expect(screen.getByTestId("workspace-marker")).toBeInTheDocument();
});

test("tourism_experience listings render as circle-markers (not workspace markers)", () => {
  const tourismListing = makeListing({
    id: "tour-1",
    name: "Soweto Heritage Tour",
    category: "accommodation",
    listing_type: "tourism_experience",
  });
  render(<LeafletMap listings={[tourismListing]} onSelect={() => undefined} />);

  expect(screen.getByTestId("circle-marker")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-marker")).not.toBeInTheDocument();
});

test("safari listings render as lion markers with safari type tooltip", () => {
  const safariListing = makeListing({
    id: "safari-kruger-national-park-01",
    name: "Kruger National Park",
    category: "safari",
    listing_type: "safari",
    safari_type: "national_park",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[safariListing]} onSelect={() => undefined} />);

  const marker = screen.getByTestId("safari-marker");
  expect(marker.getAttribute("data-icon-html")).toContain("goombi-safari-lion-marker");
  expect(marker.getAttribute("data-icon-html")).toContain("#f59e0b");
  expect(marker.getAttribute("data-icon-html")).toContain("&#129409;");
  expect(marker).toHaveTextContent("Kruger National Park");
  expect(marker).toHaveTextContent("National Park");
});

test("multiple layer types render with their layer-specific marker types", () => {
  const listings = [
    makeListing({ id: "acc-1", listing_type: "accommodation" }),
    makeListing({ id: "rest-1", listing_type: "restaurant", category: "accommodation" }),
    makeListing({ id: "safari-1", listing_type: "safari", category: "safari", safari_type: "game_reserve" }),
    makeListing({ id: "evt-1", listing_type: "event_space", category: "accommodation" }),
    makeListing({ id: "estate-1", listing_type: "estate_living_zone", category: "accommodation" }),
  ];
  render(<LeafletMap listings={listings} onSelect={() => undefined} />);

  expect(screen.getAllByTestId("circle-marker")).toHaveLength(2);
  expect(screen.getAllByTestId("workspace-marker")).toHaveLength(1);
  expect(screen.getAllByTestId("safari-marker")).toHaveLength(1);
});

test("estate_living_zone listing does not render a public marker", () => {
  const estateListing = makeListing({
    id: "estate-1",
    name: "Waterfall Estate Demo",
    category: "accommodation",
    listing_type: "estate_living_zone",
  });
  render(<LeafletMap listings={[estateListing]} onSelect={() => undefined} />);

  expect(screen.queryByTestId("circle-marker")).not.toBeInTheDocument();
  expect(screen.queryByTestId("workspace-marker")).not.toBeInTheDocument();
});

test("property_opportunity and business_hub are not valid listing_types", () => {
  expect(ALL_LISTING_TYPES).not.toContain("property_opportunity");
  expect(ALL_LISTING_TYPES).not.toContain("business_hub");
  expect(ALL_LISTING_TYPES).not.toContain("relocation_zone");
  expect(ALL_LISTING_TYPES).toHaveLength(9);
});

test("exactly 9 layer types are defined", () => {
  const expected = [
    "accommodation",
    "workspace",
    "tourism_experience",
    "restaurant",
    "safari",
    "transport_node",
    "estate_living_zone",
    "event_space",
    "township",
  ];
  expect(ALL_LISTING_TYPES).toEqual(expected);
});

test("township stay listings render as black circle markers", () => {
  const listing = makeListing({
    id: "township-stay",
    name: "Soweto Stay",
    category: "township",
    listing_type: "township",
    township_type: "guesthouse",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);

  const marker = screen.getByTestId("circle-marker");
  expect(marker).toBeInTheDocument();
  expect(marker).toHaveAttribute("data-fill-color", "#111827");
  expect(marker).toHaveAttribute("data-stroke-color", "#ffffff");
  expect(marker).toHaveTextContent("Soweto Stay");
  expect(marker).toHaveTextContent("Guesthouse");
});

test("township cultural listings render as diamond markers", () => {
  const listing = makeListing({
    id: "township-culture",
    name: "Vilakazi Culture Hub",
    category: "township",
    listing_type: "township",
    township_type: "cultural_centre",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);

  const marker = screen.getByTestId("workspace-marker");
  expect(marker.getAttribute("data-icon-html")).toContain("#111827");
  expect(marker.getAttribute("data-icon-html")).toContain("#ffffff");
  expect(marker).toHaveTextContent("Vilakazi Culture Hub");
  expect(marker).toHaveTextContent("Cultural Centre");
});

test("township restaurant and market markers remain smaller black circles", () => {
  const townshipStay = makeListing({
    id: "township-stay-size",
    name: "Stay Size",
    category: "township",
    listing_type: "township",
    township_type: "guesthouse",
    max_guests: null,
    rooms: null,
  });
  const townshipMarket = makeListing({
    id: "township-market-size",
    name: "Market Size",
    category: "township",
    listing_type: "township",
    township_type: "market",
    max_guests: null,
    rooms: null,
  });

  render(<LeafletMap listings={[townshipStay, townshipMarket]} onSelect={() => undefined} />);

  const markers = screen.getAllByTestId("circle-marker");
  expect(markers).toHaveLength(2);
  expect(markers[0]).toHaveAttribute("data-fill-color", "#111827");
  expect(markers[1]).toHaveAttribute("data-fill-color", "#111827");
  expect(Number(markers[0].getAttribute("data-radius"))).toBeGreaterThan(Number(markers[1].getAttribute("data-radius")));
});

test("restaurant listing renders as food-pin marker", () => {
  const listing = makeListing({
    id: "rest-1",
    name: "Open Kitchen",
    category: "accommodation",
    listing_type: "restaurant",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);
  const marker = screen.getByTestId("workspace-marker");
  expect(marker).toBeInTheDocument();
  expect(marker.getAttribute("data-icon-html")).toContain("#dc2626");
  expect(marker).toHaveTextContent("Open Kitchen");
  expect(marker).toHaveTextContent("Restaurant");
  expect(screen.queryByTestId("circle-marker")).not.toBeInTheDocument();
});

test("demo restaurant marker tooltip includes cuisine label", () => {
  const listing = makeListing({
    id: "demo-prospect-1",
    name: "Prospect Grill",
    category: "restaurant",
    listing_type: "restaurant",
    cuisine_tags: ["Steakhouse", "Seafood"],
    source_type: "demo_public_restaurant",
    max_guests: null,
    rooms: null,
  });

  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);

  const marker = screen.getByTestId("workspace-marker");
  expect(marker).toHaveTextContent("Prospect Grill");
  expect(marker).toHaveTextContent("Steakhouse | Seafood");
});

test("transport_node listing renders as circle-marker", () => {
  const listing = makeListing({
    id: "transport-1",
    name: "Sandton Gautrain",
    category: "accommodation",
    listing_type: "transport_node",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);
  expect(screen.getByTestId("circle-marker")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-marker")).not.toBeInTheDocument();
});

test("event_space listing renders as circle-marker", () => {
  const listing = makeListing({
    id: "event-1",
    name: "Sandton Convention Centre",
    category: "accommodation",
    listing_type: "event_space",
    max_guests: null,
    rooms: null,
  });
  render(<LeafletMap listings={[listing]} onSelect={() => undefined} />);
  expect(screen.getByTestId("circle-marker")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-marker")).not.toBeInTheDocument();
});

test("all public layer types render the correct marker type", () => {
  const listings: Listing[] = [
    makeListing({ id: "acc", listing_type: "accommodation" }),
    makeListing({ id: "tour", listing_type: "tourism_experience", category: "accommodation" }),
    makeListing({ id: "rest", listing_type: "restaurant", category: "accommodation", max_guests: null, rooms: null }),
    makeListing({ id: "safari", listing_type: "safari", category: "safari", safari_type: "private_reserve", max_guests: null, rooms: null }),
    makeListing({ id: "trans", listing_type: "transport_node", category: "accommodation", max_guests: null, rooms: null }),
    makeListing({ id: "estate", listing_type: "estate_living_zone", category: "accommodation", max_guests: null, rooms: null }),
    makeListing({ id: "event", listing_type: "event_space", category: "accommodation", max_guests: null, rooms: null }),
  ];
  const workspace = makeListing({
    id: "ws",
    category: "workspace",
    listing_type: "workspace",
    provider_name: "Workshop17",
    workspace_type: "coworking",
    pricing_status: "not_publicly_available",
    source_url: "https://example.com",
    source_note: "Public source.",
  });
  render(<LeafletMap listings={[...listings, workspace]} onSelect={() => undefined} />);

  // estate markers are suppressed from public map rendering
  expect(screen.getAllByTestId("circle-marker")).toHaveLength(4);
  // workspace and restaurant render custom Marker icons
  expect(screen.getAllByTestId("workspace-marker")).toHaveLength(2);
  expect(screen.getAllByTestId("safari-marker")).toHaveLength(1);
});

test("renders bolder event markers and handles event click", () => {
  const onSelectEvent = vi.fn();
  const event = makeEvent();
  render(<LeafletMap listings={[makeListing({ id: "acc-1" })]} events={[event]} onSelect={() => undefined} onSelectEvent={onSelectEvent} />);

  const marker = screen.getByTestId("event-marker");
  expect(marker).toHaveTextContent("Durban July");
  expect(marker.getAttribute("data-icon-html")).toContain("goombi-event-bold-marker");
  expect(marker.getAttribute("data-icon-html")).toContain("#e11d48");
  expect(marker.getAttribute("data-icon-html")).toContain("width:30px");
  expect(marker.getAttribute("data-icon-html")).toContain("&#9733;");

  fireEvent.click(marker);

  expect(onSelectEvent).toHaveBeenCalledWith(event);
});

test("renders bolder solid nightlife marker and handles nightlife click", () => {
  const onSelectNightlife = vi.fn();
  const venue = makeNightlife();
  render(<LeafletMap listings={[]} nightlife={[venue]} onSelect={() => undefined} onSelectNightlife={onSelectNightlife} />);

  const marker = screen.getByTestId("nightlife-marker");
  expect(marker).toHaveTextContent("Origin Nightclub");
  expect(marker.getAttribute("data-icon-html")).toContain("goombi-nightlife-bold-marker");
  expect(marker.getAttribute("data-icon-html")).toContain("#4f46e5");
  expect(marker.getAttribute("data-icon-html")).toContain("width:30px");
  expect(marker.getAttribute("data-icon-html")).toContain("&#9790;");

  fireEvent.click(marker);

  expect(onSelectNightlife).toHaveBeenCalledWith(venue);
});

test("clusters dense restaurant markers into a red restaurant cluster", () => {
  mockMapState.zoom = 8;
  render(<LeafletMap listings={makeDenseRestaurantListings(30)} onSelect={() => undefined} />);

  const cluster = screen.getByTestId("cluster-marker");
  expect(cluster).toHaveAttribute("data-cluster-family", "restaurant");
  expect(cluster).toHaveAttribute("data-cluster-count", "30");
  expect(cluster.getAttribute("data-icon-html")).toContain("goombi-restaurant-cluster");
  expect(cluster.getAttribute("data-icon-html")).toContain("#dc2626");
  expect(cluster).toHaveTextContent("30 Restaurant places");
  expect(screen.queryByText("Restaurant 0")).not.toBeInTheDocument();
});

test("cluster click fits the clustered marker bounds", () => {
  mockMapState.zoom = 8;
  render(<LeafletMap listings={makeDenseRestaurantListings(30)} onSelect={() => undefined} />);

  fireEvent.click(screen.getByTestId("cluster-marker"));

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  expect(mockFitBounds).toHaveBeenCalledWith(expect.any(Array), { padding: [52, 52] });
});

test("renders individual markers again at high zoom", () => {
  mockMapState.zoom = 15;
  render(<LeafletMap listings={makeDenseRestaurantListings(30)} onSelect={() => undefined} />);

  expect(screen.queryByTestId("cluster-marker")).not.toBeInTheDocument();
  const markers = screen.getAllByTestId("workspace-marker");
  expect(markers).toHaveLength(30);
  expect(markers[0]).toHaveTextContent("Restaurant 0");
});

test("township markers cluster into a black township cluster", () => {
  mockMapState.zoom = 8;
  render(<LeafletMap listings={makeDenseTownshipListings(30)} onSelect={() => undefined} />);

  const cluster = screen.getByTestId("cluster-marker");
  expect(cluster).toHaveAttribute("data-cluster-family", "township");
  expect(cluster.getAttribute("data-icon-html")).toContain("goombi-township-cluster");
  expect(cluster.getAttribute("data-icon-html")).toContain("#111827");
  expect(cluster).toHaveTextContent("30 Township Tourism places");
});

test("mixed dense marker families render as a neutral mixed cluster", () => {
  mockMapState.zoom = 8;
  const restaurants = makeDenseRestaurantListings(15);
  const safaris = Array.from({ length: 15 }, (_, index) =>
    makeListing({
      id: `safari-cluster-${index}`,
      name: `Safari ${index}`,
      category: "safari",
      listing_type: "safari",
      safari_type: "game_reserve",
      latitude: -26.101 + index * 0.0002,
      longitude: 28.051 + index * 0.0002,
      max_guests: null,
      rooms: null,
    }),
  );

  render(<LeafletMap listings={[...restaurants, ...safaris]} onSelect={() => undefined} />);

  const cluster = screen.getByTestId("cluster-marker");
  expect(cluster).toHaveAttribute("data-cluster-family", "mixed");
  expect(cluster).toHaveAttribute("data-cluster-count", "30");
  expect(cluster.getAttribute("data-icon-html")).toContain("goombi-mixed-cluster");
  expect(cluster.getAttribute("data-icon-html")).toContain("#1f2937");
  expect(cluster).toHaveTextContent("30 places nearby");
});
