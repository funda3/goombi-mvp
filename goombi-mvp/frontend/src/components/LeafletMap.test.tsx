import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { Listing } from "../types/listing";

// Stable mock map methods captured via vi.hoisted so they're available in the factory
const { mockSetView, mockFitBounds } = vi.hoisted(() => ({
  mockSetView: vi.fn(),
  mockFitBounds: vi.fn(),
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
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    center: [number, number];
  }) => (
    <button
      data-testid="circle-marker"
      aria-label={`Marker at ${center[0]},${center[1]}`}
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
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useMap: () => ({ setView: mockSetView, fitBounds: mockFitBounds }),
}));

import { LeafletMap } from "./LeafletMap";

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
