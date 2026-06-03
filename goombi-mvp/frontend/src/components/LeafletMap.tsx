import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Map as LeafletMapInstance } from "leaflet";

import type { EventRecord } from "../types/event";
import type { NightlifeVenue } from "../types/nightlife";
import { getListingType, type Listing, type ListingType } from "../types/listing";
import type { ServiceMarker } from "../types/services";

export type FlyTo = { lat: number; lng: number; zoom: number };

type MarkerFamily = "accommodation" | "workspace" | "restaurant" | "safari" | "township" | "event" | "nightlife" | "mixed";

type ClusterPoint = {
  id: string;
  name: string;
  family: MarkerFamily;
  latitude: number;
  longitude: number;
  render: () => React.ReactNode;
};

type ClusterGroup = {
  id: string;
  points: ClusterPoint[];
  latitude: number;
  longitude: number;
  family: MarkerFamily;
};
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
  safari: "#f59e0b",             // amber
  transport_node: "#475569",     // slate
  estate_living_zone: "#92400e", // warm amber-brown (distinct from all other layers)
  event_space: "#db2777",        // pink
  township: "#111827",           // black-slate for township tourism
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

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const reportZoom = () => onZoomChange(typeof map.getZoom === "function" ? map.getZoom() : JHB_ZOOM);
    reportZoom();
    map.on?.("zoomend", reportZoom);
    return () => {
      map.off?.("zoomend", reportZoom);
    };
  }, [map, onZoomChange]);
  return null;
}

const CLUSTER_MIN_POINTS = 25;

const CLUSTER_COLORS: Record<MarkerFamily, string> = {
  accommodation: "#0f766e",
  workspace: "#a21caf",
  restaurant: "#dc2626",
  safari: "#f59e0b",
  township: "#111827",
  event: "#e11d48",
  nightlife: "#4f46e5",
  mixed: "#1f2937",
};

const CLUSTER_LABELS: Record<MarkerFamily, string> = {
  accommodation: "Accommodation places",
  workspace: "Workspace places",
  restaurant: "Restaurant places",
  safari: "Safari & Wildlife places",
  township: "Township Tourism places",
  event: "Event places",
  nightlife: "Nightlife places",
  mixed: "places",
};

function clusterRadiusForZoom(zoom: number) {
  if (zoom >= 14) return 0;
  if (zoom >= 12) return 0.035;
  if (zoom >= 9) return 0.18;
  return 1.15;
}

function familyForListing(listing: Listing): MarkerFamily {
  const listingType = getListingType(listing);
  if (listingType === "workspace") return "workspace";
  if (listingType === "restaurant") return "restaurant";
  if (listingType === "safari") return "safari";
  if (listingType === "township") return "township";
  return "accommodation";
}

function clusterFamily(points: ClusterPoint[]): MarkerFamily {
  const families = Array.from(new Set(points.map((point) => point.family)));
  return families.length === 1 ? families[0] : "mixed";
}

function bucketKey(point: ClusterPoint, radius: number) {
  if (radius === 0) {
    return `${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`;
  }
  return `${Math.round(point.latitude / radius)}:${Math.round(point.longitude / radius)}`;
}

function clusterPoints(points: ClusterPoint[], zoom: number): ClusterGroup[] {
  if (points.length < CLUSTER_MIN_POINTS) {
    return points.map((point) => ({
      id: `single-${point.id}`,
      points: [point],
      latitude: point.latitude,
      longitude: point.longitude,
      family: point.family,
    }));
  }

  const radius = clusterRadiusForZoom(zoom);
  const buckets = new Map<string, ClusterPoint[]>();
  points.forEach((point) => {
    const key = bucketKey(point, radius);
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  });

  return Array.from(buckets.entries()).flatMap(([key, bucket]) => {
    if (bucket.length === 1) {
      const [point] = bucket;
      return [{ id: `single-${point.id}`, points: bucket, latitude: point.latitude, longitude: point.longitude, family: point.family }];
    }
    const latitude = bucket.reduce((sum, point) => sum + point.latitude, 0) / bucket.length;
    const longitude = bucket.reduce((sum, point) => sum + point.longitude, 0) / bucket.length;
    return [{ id: `cluster-${key}`, points: bucket, latitude, longitude, family: clusterFamily(bucket) }];
  });
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
  const [zoom, setZoom] = useState(JHB_ZOOM);
  const highlighted = useMemo(() => new Set(highlightedListingIds), [highlightedListingIds]);
  const highlightedEvents = useMemo(() => new Set(highlightedEventIds), [highlightedEventIds]);

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
    const size = isSelected ? 34 : 30;
    const border = isSelected ? "#831843" : "#ffffff";
    return divIcon({
      html: `<div class="goombi-event-bold-marker" title="Event" aria-label="Event" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:#e11d48;border:${isSelected ? 3 : 2}px solid ${border};box-sizing:border-box;color:#fff;font-size:${Math.round(size * 0.6)}px;font-weight:900;line-height:1;box-shadow:0 7px 16px rgba(190,18,60,0.32);">&#9733;</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "",
    });
  }

  function nightlifeIcon(isSelected: boolean) {
    const size = isSelected ? 34 : 30;
    const border = isSelected ? "#1e1b4b" : "#ffffff";
    return divIcon({
      html: `<div class="goombi-nightlife-bold-marker" title="Nightlife" aria-label="Nightlife" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:#4f46e5;border:${isSelected ? 3 : 2}px solid ${border};box-sizing:border-box;color:#fff;font-size:${Math.round(size * 0.64)}px;font-weight:900;line-height:1;box-shadow:0 7px 16px rgba(67,56,202,0.34);">&#9790;</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
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

  function safariIcon(isSelected: boolean) {
    const size = isSelected ? 30 : 26;
    const border = isSelected ? "#92400e" : "#ffffff";
    return divIcon({
      html: `<div class="goombi-safari-lion-marker" title="Safari & Wildlife" aria-label="Safari & Wildlife" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:#f59e0b;border:${isSelected ? 3 : 2}px solid ${border};box-sizing:border-box;color:#1f2937;font-size:${Math.round(size * 0.62)}px;line-height:1;box-shadow:0 6px 14px rgba(120,53,15,0.28);">&#129409;</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "",
    });
  }

  function townshipDiamondIcon(isSelected: boolean) {
    const size = isSelected ? 18 : 14;
    const border = "#ffffff";
    const outer = Math.round(size * 1.42);
    const pad = Math.round((outer - size) / 2);
    return divIcon({
      html: `<div style="width:${size}px;height:${size}px;margin:${pad}px;background:#111827;border:${isSelected ? 3 : 2}px solid ${border};border-radius:3px;box-sizing:border-box;transform:rotate(45deg);"></div>`,
      iconSize: [outer, outer],
      iconAnchor: [outer / 2, outer / 2],
      className: "",
    });
  }

  function formatRestaurantLabel(listing: Listing) {
    const cuisines = Array.isArray(listing.cuisine_tags)
      ? listing.cuisine_tags.map((item) => item.trim()).filter(Boolean)
      : [];
    return cuisines.length > 0 ? cuisines.slice(0, 2).join(" | ") : "Restaurant";
  }

  function formatSafariType(value?: string | null) {
    return value
      ? value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
      : "Safari & Wildlife";
  }

  function formatTownshipType(value?: string | null) {
    return value
      ? value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
      : "Township Tourism";
  }

  function clusterTooltip(group: ClusterGroup) {
    const count = group.points.length;
    if (group.family === "mixed") return `${count} places nearby`;
    return `${count} ${CLUSTER_LABELS[group.family]}`;
  }

  function clusterIcon(group: ClusterGroup) {
    const count = group.points.length;
    const size = count >= 100 ? 44 : count >= 50 ? 40 : 36;
    const color = CLUSTER_COLORS[group.family];
    return divIcon({
      html: `<div class="goombi-cluster-marker goombi-${group.family}-cluster" data-testid="cluster-marker" data-cluster-family="${group.family}" data-cluster-count="${count}" title="${clusterTooltip(group)}" aria-label="${clusterTooltip(group)}" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid #ffffff;box-sizing:border-box;color:#fff;font-size:${count >= 100 ? 13 : 14}px;font-weight:900;line-height:1;box-shadow:0 8px 18px rgba(15,23,42,0.35);">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: `goombi-${group.family}-cluster`,
    });
  }

  function zoomToCluster(group: ClusterGroup) {
    if (!mapRef.current) return;
    const coords = group.points.map((point) => [point.latitude, point.longitude] as [number, number]);
    if (coords.length > 1) {
      mapRef.current.fitBounds(coords, { padding: [52, 52] });
    } else {
      mapRef.current.flyTo?.([group.latitude, group.longitude], Math.min(zoom + 2, 15), { animate: true, duration: 0.8 });
    }
  }

  const markerPoints = useMemo<ClusterPoint[]>(() => {
    const listingPoints = listings
      .filter((listing) => getListingType(listing) !== "estate_living_zone")
      .map((listing): ClusterPoint => {
        const lt = getListingType(listing);
        const isHighlighted = selectedId === listing.id || highlighted.has(listing.id);
        const render = () => {
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
                <Tooltip><span>{listing.name}<br />{formatRestaurantLabel(listing)}</span></Tooltip>
              </Marker>
            );
          }
          if (lt === "safari") {
            return (
              <Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={safariIcon(isHighlighted)}
                eventHandlers={{ click: () => onSelect(listing) }}
              >
                <Tooltip><span>{listing.name}<br />{formatSafariType(listing.safari_type)}</span></Tooltip>
              </Marker>
            );
          }
          if (lt === "township") {
            const townshipType = listing.township_type ?? "";
            const isCulturalOrAttraction = townshipType === "cultural_centre" || townshipType === "attraction";
            const isRestaurantOrMarket = townshipType === "restaurant" || townshipType === "market";

            if (isCulturalOrAttraction) {
              return (
                <Marker
                  key={listing.id}
                  position={[listing.latitude, listing.longitude]}
                  icon={townshipDiamondIcon(isHighlighted)}
                  eventHandlers={{ click: () => onSelect(listing) }}
                >
                  <Tooltip><span>{listing.name}<br />{formatTownshipType(listing.township_type)}</span></Tooltip>
                </Marker>
              );
            }

            return (
              <CircleMarker
                key={listing.id}
                center={[listing.latitude, listing.longitude]}
                radius={isRestaurantOrMarket ? (isHighlighted ? 11 : 8) : (isHighlighted ? 14 : 11)}
                pathOptions={{
                  fillColor: "#111827",
                  fillOpacity: 0.9,
                  color: "#ffffff",
                  weight: isHighlighted ? 3 : 2,
                }}
                eventHandlers={{ click: () => onSelect(listing) }}
              >
                <Tooltip><span>{listing.name}<br />{formatTownshipType(listing.township_type)}</span></Tooltip>
              </CircleMarker>
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
        };
        return { id: listing.id, name: listing.name, family: familyForListing(listing), latitude: listing.latitude, longitude: listing.longitude, render };
      });

    const eventPoints = events.map((event): ClusterPoint => {
      const isHighlighted = selectedEventId === event.id || highlightedEvents.has(event.id);
      return {
        id: event.id,
        name: event.name,
        family: "event",
        latitude: event.latitude,
        longitude: event.longitude,
        render: () => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={eventIcon(isHighlighted)}
            eventHandlers={{ click: () => onSelectEvent?.(event) }}
          >
            <Tooltip>{event.name}</Tooltip>
          </Marker>
        ),
      };
    });

    const nightlifePoints = nightlife.map((venue): ClusterPoint => ({
      id: venue.id,
      name: venue.name,
      family: "nightlife",
      latitude: venue.latitude,
      longitude: venue.longitude,
      render: () => (
        <Marker
          key={venue.id}
          position={[venue.latitude, venue.longitude]}
          icon={nightlifeIcon(selectedNightlifeId === venue.id)}
          eventHandlers={{ click: () => onSelectNightlife?.(venue) }}
        >
          <Tooltip>{venue.name}</Tooltip>
        </Marker>
      ),
    }));

    return [...listingPoints, ...eventPoints, ...nightlifePoints];
  }, [events, highlighted, highlightedEvents, listings, nightlife, onSelect, onSelectEvent, onSelectNightlife, selectedEventId, selectedId, selectedNightlifeId]);

  const clusteredMarkers = useMemo(() => clusterPoints(markerPoints, zoom), [markerPoints, zoom]);
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
        <ZoomTracker onZoomChange={setZoom} />
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
        {clusteredMarkers.map((group) => {
          if (group.points.length === 1) return group.points[0].render();
          return (
            <Marker
              key={group.id}
              position={[group.latitude, group.longitude]}
              icon={clusterIcon(group)}
              eventHandlers={{ click: () => zoomToCluster(group) }}
            >
              <Tooltip>{clusterTooltip(group)}</Tooltip>
            </Marker>
          );
        })}
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






