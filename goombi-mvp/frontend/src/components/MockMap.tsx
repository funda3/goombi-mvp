import { MouseEvent, PointerEvent, WheelEvent, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import type { EventRecord } from "../types/event";
import type { NightlifeVenue } from "../types/nightlife";
import { getListingType, isWorkspace, type Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";

type Props = {
  listings: Listing[];
  events?: EventRecord[];
  nightlife?: NightlifeVenue[];
  selectedId?: string;
  selectedEventId?: string;
  selectedNightlifeId?: string;
  onSelect: (listing: Listing) => void;
  onSelectEvent?: (event: EventRecord) => void;
  onSelectNightlife?: (venue: NightlifeVenue) => void;
  serviceMarker?: ServiceMarker | null;
  region?: string;
  highlightedListingIds?: string[];
  highlightedEventIds?: string[];
};

type Point = {
  x: number;
  y: number;
};

type DragState = Point & {
  pointerId: number;
};

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function listingPosition(listing: Listing) {
  const left = 10 + ((listing.longitude - 27.965) / 0.11) * 78;
  const top = 9 + ((listing.latitude + 26.155) / 0.155) * 80;
  return {
    left: `${Math.max(7, Math.min(left, 93))}%`,
    top: `${Math.max(9, Math.min(top, 91))}%`,
  };
}

export function MockMap({
  listings,
  events = [],
  nightlife = [],
  selectedId,
  selectedEventId,
  selectedNightlifeId,
  onSelect,
  onSelectEvent,
  onSelectNightlife,
  serviceMarker,
  highlightedListingIds = [],
  highlightedEventIds = [],
}: Props) {
  const highlighted = new Set(highlightedListingIds);
  const highlightedEvents = new Set(highlightedEventIds);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState>();

  function zoomAround(nextZoom: number, anchor?: Point) {
    const clampedZoom = clampZoom(nextZoom);
    if (clampedZoom === zoom) return;

    if (!viewportRef.current) {
      setZoom(clampedZoom);
      return;
    }

    const bounds = viewportRef.current.getBoundingClientRect();
    const pivot = anchor ?? { x: bounds.width / 2, y: bounds.height / 2 };
    const mapPoint = {
      x: (pivot.x - pan.x) / zoom,
      y: (pivot.y - pan.y) / zoom,
    };
    setPan({
      x: pivot.x - mapPoint.x * clampedZoom,
      y: pivot.y - mapPoint.y * clampedZoom,
    });
    setZoom(clampedZoom);
  }

  function resetView() {
    setPan({ x: 0, y: 0 });
    setZoom(DEFAULT_ZOOM);
    setDrag(undefined);
  }

  function fitToResults() {
    if (!viewportRef.current || (listings.length === 0 && events.length === 0 && nightlife.length === 0)) {
      resetView();
      return;
    }
    const bounds = viewportRef.current.getBoundingClientRect();
    const listingPositions = listings
      .filter((listing) => getListingType(listing) !== "estate_living_zone")
      .map((listing) => {
      const position = listingPosition(listing);
      return { x: Number.parseFloat(position.left), y: Number.parseFloat(position.top) };
      });
    const eventPositions = events.map((event) => {
      const position = listingPosition({ latitude: event.latitude, longitude: event.longitude } as Listing);
      return { x: Number.parseFloat(position.left), y: Number.parseFloat(position.top) };
    });
    const nightlifePositions = nightlife.map((venue) => {
      const position = listingPosition({ latitude: venue.latitude, longitude: venue.longitude } as Listing);
      return { x: Number.parseFloat(position.left), y: Number.parseFloat(position.top) };
    });
    const positions = [...listingPositions, ...eventPositions, ...nightlifePositions];
    const minX = Math.min(...positions.map((position) => position.x));
    const maxX = Math.max(...positions.map((position) => position.x));
    const minY = Math.min(...positions.map((position) => position.y));
    const maxY = Math.max(...positions.map((position) => position.y));
    const widthRatio = Math.max((maxX - minX) / 84, 0.25);
    const heightRatio = Math.max((maxY - minY) / 82, 0.25);
    const nextZoom = clampZoom(Math.min(1 / widthRatio, 1 / heightRatio, 2.5));
    setZoom(nextZoom);
    setPan({
      x: bounds.width * (0.5 - ((minX + maxX) / 200) * nextZoom),
      y: bounds.height * (0.5 - ((minY + maxY) / 200) * nextZoom),
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    zoomAround(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  // TODO: Add multi-touch pinch zoom when the mock map needs Google Maps gesture parity.
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan((current) => ({
      x: current.x + event.clientX - drag.x,
      y: current.y + event.clientY - drag.y,
    }));
    setDrag({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDrag(undefined);
  }

  function keepMarkerClickable(event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <div
      aria-label="Mock property map"
      className={`relative h-full min-h-screen overflow-hidden bg-[linear-gradient(145deg,#d6ead8,#b8d8db_45%,#f6dfb9)] touch-none ${
        drag ? "cursor-grabbing" : "cursor-grab"
      }`}
      data-pan={`${Math.round(pan.x)},${Math.round(pan.y)}`}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      ref={viewportRef}
    >
      <div
        className="absolute inset-0 will-change-transform"
        data-testid="mock-map-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(16,42,51,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(16,42,51,.12)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute left-[18%] top-0 h-full w-16 rotate-12 bg-white/35" />
        <div className="absolute left-0 top-[53%] h-12 w-full -rotate-3 bg-white/35" />
        {listings.map((listing) => {
          const listingType = getListingType(listing);
          if (listingType === "estate_living_zone") {
            return null;
          }
          const isRestaurant = listingType === "restaurant";
          return (
            <button
              aria-label={`Open ${listing.name}`}
              className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-white text-[10px] shadow-lg transition hover:scale-110 ${
                isWorkspace(listing)
                  ? `${listing.workspace_type === "meeting_room" || listing.workspace_type === "boardroom" ? "rotate-45" : "rounded-sm"} bg-fuchsia-700`
                  : isRestaurant
                    ? "rounded-full bg-red-600 text-white"
                    : `${listing.verified_status ? "bg-teal-700" : "bg-orange-500"} rounded-full`
              } ${(selectedId === listing.id || highlighted.has(listing.id)) ? "ring-4 ring-amber-300" : ""}`}
              key={listing.id}
              style={listingPosition(listing)}
              title={`${listing.name}, ${listing.suburb}`}
              type="button"
              onClick={() => onSelect(listing)}
              onMouseDown={keepMarkerClickable}
              onPointerDown={keepMarkerClickable}
            >
              {isRestaurant ? "F" : ""}
            </button>
          );
        })}
        {events.map((event) => (
          <button
            key={event.id}
            aria-label={`Open ${event.name}`}
            className={`goombi-event-star-marker absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-lg leading-none text-rose-600 transition hover:scale-110 ${(selectedEventId === event.id || highlightedEvents.has(event.id)) ? "ring-2 ring-amber-300" : ""}`}
            style={listingPosition({ latitude: event.latitude, longitude: event.longitude } as Listing)}
            title={`${event.name}, ${event.city}`}
            type="button"
            onClick={() => onSelectEvent?.(event)}
            onMouseDown={keepMarkerClickable}
            onPointerDown={keepMarkerClickable}
          >
            ★
          </button>
        ))}
        {nightlife.map((venue) => (
          <button
            key={venue.id}
            aria-label={`Open ${venue.name}`}
            className={`goombi-nightlife-moon-marker absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-lg leading-none text-indigo-700 transition hover:scale-110 ${selectedNightlifeId === venue.id ? "ring-2 ring-amber-300" : ""}`}
            style={listingPosition({ latitude: venue.latitude, longitude: venue.longitude } as Listing)}
            title={`${venue.name}, ${venue.city}`}
            type="button"
            onClick={() => onSelectNightlife?.(venue)}
            onMouseDown={keepMarkerClickable}
            onPointerDown={keepMarkerClickable}
          >
            ☾
          </button>
        ))}
        {serviceMarker && (
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-lg"
            style={listingPosition({ latitude: serviceMarker.lat, longitude: serviceMarker.lon } as Listing)}
            title={serviceMarker.label}
          />
        )}
      </div>
      <div className="absolute bottom-6 left-6 rounded-md bg-slate-950/80 px-3 py-2 text-sm font-semibold text-white">
        Mock map mode
      </div>
      <div className="absolute bottom-6 right-6 z-20 grid gap-2 rounded-lg border border-white/70 bg-white/95 p-2 shadow-panel backdrop-blur">
        <div className="rounded-md bg-slate-100 px-2 py-1 text-center text-xs font-bold text-slate-700" aria-live="polite">
          {zoom.toFixed(2)}x
        </div>
        <button aria-label="Zoom in" className="secondary-button h-9 w-9 p-0" type="button" onClick={() => zoomAround(zoom + ZOOM_STEP)}>
          <Plus className="h-4 w-4" />
        </button>
        <button aria-label="Zoom out" className="secondary-button h-9 w-9 p-0" type="button" onClick={() => zoomAround(zoom - ZOOM_STEP)}>
          <Minus className="h-4 w-4" />
        </button>
        <button aria-label="Reset map view" className="secondary-button h-9 w-9 p-0" title="Reset view" type="button" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="secondary-button px-2 py-1 text-xs" type="button" onClick={fitToResults}>Fit</button>
      </div>
    </div>
  );
}
