import { useEffect, useRef } from "react";
import { divIcon } from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Map as LeafletMapInstance } from "leaflet";

import type { EventRecord } from "../types/event";
import type { NightlifeVenue } from "../types/nightlife";
import { getListingType, type Listing, type ListingType } from "../types/listing";
import type { ServiceMarker } from "../types/services";

export type FlyTo = { lat: number; lng: number; zoom: number };

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
  centerRegion?: string;
  flyTo?: FlyTo | null;
  highlightedListingIds?: string[];
  highlightedEventIds?: string[];
};

const JHB_CENTER: [number, number] = [-26.1076, 28.0567];
const CPT_CENTER: [number, number] = [-33.9249, 18.4241];
const DBN_CENTER: [number, number] = [-29.8587, 31.0218];
const SA_CENTER: [number, number] = [-30.5595, 22.9375];
const JHB_ZOOM = 11;
const SA_ZOOM = 5;

/** Marker fill colours by listing layer type. Accommodation uses verified_status override. */
const LAYER_COLORS: Record<ListingType, string> = {
  accommodation: "#0f766e",      // teal — overridden by verified_status below
  workspace: "#a21caf",          // purple — rendered as diamond Marker, not CircleMarker
  tourism_experience: "#d97706", // amber
  restaurant: "#dc2626",         // red
  transport_node: "#475569",     // slate
  estate_living_zone: "#92400e", // warm amber-brown (distinct from all other layers)
  event_space: "#db2777",        // pink
};

/** Captures the Leaflet map instance into a ref so controls outside MapContainer can call it. */
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMapInstance | null> }) {
  const map = useMap();
  useEffect(() => {
    if (!mapRef.current) map.setView(JHB_CENTER, JHB_ZOOM); // guarantee initial position on first mount
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export function LeafletMap({
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
  centerRegion,
  flyTo,
  highlightedListingIds = [],
  highlightedEventIds = [],
}: Props) {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const highlighted = new Set(highlightedListingIds);
  const highlightedEvents = new Set(highlightedEventIds);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { animate: true, duration: 1.2 });
  }, [flyTo]);

  useEffect(() => {
    if (!mapRef.current || !centerRegion || centerRegion === "all") return;
    if (centerRegion === "Western Cape") {
      mapRef.current.setView(CPT_CENTER, JHB_ZOOM);
    } else if (centerRegion === "KwaZulu-Natal") {
      mapRef.current.setView(DBN_CENTER, JHB_ZOOM);
    } else {
      mapRef.current.setView(JHB_CENTER, JHB_ZOOM);
    }
  }, [centerRegion]);

  function fitResults() {
    if (!mapRef.current || (listings.length === 0 && events.length === 0 && nightlife.length === 0)) return;
    const listingCoords = listings
      .filter((l) => getListingType(l) !== "estate_living_zone")
      .map((l) => [l.latitude, l.longitude] as [number, number]);
    const eventCoords = events.map((e) => [e.latitude, e.longitude] as [number, number]);
    const nightlifeCoords = nightlife.map((n) => [n.latitude, n.longitude] as [number, number]);
    const coords = [...listingCoords, ...eventCoords, ...nightlifeCoords];
    mapRef.current.fitBounds(coords, { padding: [40, 40] });
  }

  function goToSA() {
    mapRef.current?.setView(SA_CENTER, SA_ZOOM);
  }

  function goToJHB() {
    mapRef.current?.setView(JHB_CENTER, JHB_ZOOM);
  }

  function workspaceIcon(isDiamond: boolean, isSelected: boolean) {
    const sz = isSelected ? 18 : 14;
    const bw = isSelected ? 3 : 2;
    const border = isSelected ? "#f59e0b" : "#ffffff";
    if (isDiamond) {
      const outer = Math.round(sz * 1.42);
      const pad = Math.round((outer - sz) / 2);
      return divIcon({
        html: `<div style="width:${sz}px;height:${sz}px;margin:${pad}px;background:#a21caf;border:${bw}px solid ${border};border-radius:3px;box-sizing:border-box;transform:rotate(45deg);"></div>`,
        iconSize: [outer, outer],
        iconAnchor: [outer / 2, outer / 2],
        className: "",
      });
    }
    return divIcon({
      html: `<div style="width:${sz}px;height:${sz}px;background:#a21caf;border:${bw}px solid ${border};border-radius:3px;box-sizing:border-box;"></div>`,
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
      className: "",
    });
  }

  function eventIcon(isSelected: boolean) {
    const size = isSelected ? 26 : 22;
    const ring = isSelected ? "goombi-event-pulse goombi-event-selected" : "goombi-event-pulse";
    return divIcon({
      html: `<div class="goombi-event-marker-wrap"><span class="${ring}"></span><span class="goombi-event-star" style="font-size:${size}px;">★</span></div>`,
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, (size + 8) / 2],
      className: "",
    });
  }

  function nightlifeIcon(isSelected: boolean) {
    const size = isSelected ? 24 : 20;
    const ring = isSelected ? "goombi-nightlife-pulse goombi-nightlife-selected" : "goombi-nightlife-pulse";
    return divIcon({
      html: `<div class="goombi-nightlife-marker-wrap"><span class="${ring}"></span><span class="goombi-nightlife-moon" style="font-size:${size}px;">☾</span></div>`,
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, (size + 8) / 2],
      className: "",
    });
  }

  function restaurantIcon(isSelected: boolean) {
    const size = isSelected ? 28 : 24;
    const border = isSelected ? "#f59e0b" : "#ffffff";
    return divIcon({
      html: `<div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:#dc2626;border:${isSelected ? 3 : 2}px solid ${border};box-sizing:border-box;color:#fff;font-size:${Math.round(size * 0.58)}px;line-height:1;">🍴</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "",
    });
  }

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={JHB_CENTER}
        zoom={JHB_ZOOM}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
        scrollWheelZoom
      >
        <MapRefCapture mapRef={mapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {serviceMarker && (
          <CircleMarker
            center={[serviceMarker.lat, serviceMarker.lon]}
            radius={11}
            pathOptions={{
              fillColor: "#2563eb",
              fillOpacity: 0.9,
              color: "#ffffff",
              weight: 2,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -12]}>{serviceMarker.label}</Tooltip>
          </CircleMarker>
        )}
        {listings.map((listing) => {
          const lt = getListingType(listing);
          if (lt === "estate_living_zone") {
            return null;
          }
          const isHighlighted = selectedId === listing.id || highlighted.has(listing.id);
          if (lt === "workspace") {
            return (
              <Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={workspaceIcon(
                  listing.workspace_type === "meeting_room" || listing.workspace_type === "boardroom",
                  isHighlighted,
                )}
                eventHandlers={{ click: () => onSelect(listing) }}
              >
                <Tooltip>{listing.name}</Tooltip>
              </Marker>
            );
          }
          if (lt === "restaurant") {
            return (
              <Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={restaurantIcon(isHighlighted)}
                eventHandlers={{ click: () => onSelect(listing) }}
              >
                <Tooltip>{listing.name}</Tooltip>
              </Marker>
            );
          }
          const fillColor =
            lt === "accommodation"
              ? listing.verified_status ? "#0f766e" : "#e8790a"
              : (LAYER_COLORS[lt] ?? "#475569");
          return (
            <CircleMarker
              key={listing.id}
              center={[listing.latitude, listing.longitude]}
              radius={isHighlighted ? 16 : 12}
              pathOptions={{
                fillColor,
                fillOpacity: 0.88,
                color: isHighlighted ? "#f59e0b" : "#ffffff",
                weight: isHighlighted ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelect(listing) }}
            >
              <Tooltip>{listing.name}</Tooltip>
            </CircleMarker>
          );
        })}
        {events.map((event) => {
          const isHighlighted = selectedEventId === event.id || highlightedEvents.has(event.id);
          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={eventIcon(isHighlighted)}
              eventHandlers={{ click: () => onSelectEvent?.(event) }}
            >
              <Tooltip>{event.name}</Tooltip>
            </Marker>
          );
        })}
        {nightlife.map((venue) => (
          <Marker
            key={venue.id}
            position={[venue.latitude, venue.longitude]}
            icon={nightlifeIcon(selectedNightlifeId === venue.id)}
            eventHandlers={{ click: () => onSelectNightlife?.(venue) }}
          >
            <Tooltip>{venue.name}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Map control buttons rendered outside Leaflet's canvas for full React event handling */}
      <div
        className="absolute right-2 top-20 z-[1000] flex flex-col gap-1 rounded-lg border border-white/70 bg-white/95 p-1.5 shadow-panel"
        data-testid="leaflet-controls"
      >
        <button
          aria-label="Fit to results"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          disabled={listings.length + events.length + nightlife.length === 0}
          onClick={fitResults}
          type="button"
        >
          Fit
        </button>
        <hr className="border-slate-200" />
        <button
          aria-label="South Africa view"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          onClick={goToSA}
          type="button"
        >
          SA
        </button>
        <button
          aria-label="Johannesburg North view"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          onClick={goToJHB}
          type="button"
        >
          JHB
        </button>
        <button
          aria-label="Cape Town view"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          onClick={() => mapRef.current?.setView(CPT_CENTER, JHB_ZOOM)}
          type="button"
        >
          CPT
        </button>
        <button
          aria-label="Durban view"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          onClick={() => mapRef.current?.setView(DBN_CENTER, JHB_ZOOM)}
          type="button"
        >
          DBN
        </button>
      </div>
    </div>
  );
}
