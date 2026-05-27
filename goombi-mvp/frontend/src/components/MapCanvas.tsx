import { useEffect, useRef, useState } from "react";

import type { EventRecord } from "../types/event";
import { getListingType, isWorkspace, type Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";
import { LeafletMap, type FlyTo } from "./LeafletMap";
import { MockMap } from "./MockMap";

type Props = {
  listings: Listing[];
  events?: EventRecord[];
  selectedId?: string;
  selectedEventId?: string;
  onSelect: (listing: Listing) => void;
  onSelectEvent?: (event: EventRecord) => void;
  serviceMarker?: ServiceMarker | null;
  region?: string;
  flyTo?: FlyTo | null;
  highlightedListingIds?: string[];
};

type GoogleState = "idle" | "loading" | "ready" | "failed";

const GOOGLE_LAYER_COLORS: Record<string, string> = {
  accommodation: "#0f766e",
  workspace: "#a21caf",
  tourism_experience: "#d97706",
  restaurant: "#dc2626",
  transport_node: "#475569",
  estate_living_zone: "#92400e",
  event_space: "#db2777",
};

const MAP_CENTER = { lat: -26.083, lng: 28.022 };

function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as Window & { google?: unknown }).google) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-goombi-google-map]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed")));
      return;
    }
    const script = document.createElement("script");
    script.dataset.goombiGoogleMap = "true";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed"));
    document.head.appendChild(script);
  });
}

function GoogleCircleMap({
  listings,
  events = [],
  selectedId,
  selectedEventId,
  onSelect,
  onSelectEvent,
  serviceMarker,
  highlightedListingIds = [],
}: Props) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetRef.current) return;
    const googleApi = (window as any).google;
    const map = new googleApi.maps.Map(targetRef.current, {
      center: MAP_CENTER,
      zoom: 11,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [{ featureType: "poi.business", stylers: [{ visibility: "off" }] }],
    });
    const bounds = new googleApi.maps.LatLngBounds();

    const servicePin = serviceMarker
      ? new googleApi.maps.Marker({
          map,
          position: { lat: serviceMarker.lat, lng: serviceMarker.lon },
          title: serviceMarker.label,
          icon: {
            path: googleApi.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#2563eb",
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        })
      : null;

    const highlighted = new Set(highlightedListingIds);

    const shapes = listings.map((listing) => {
      const isHighlighted = selectedId === listing.id || highlighted.has(listing.id);
      if (isWorkspace(listing)) {
        const marker = new googleApi.maps.Marker({
          map,
          position: { lat: listing.latitude, lng: listing.longitude },
          icon: {
            path:
              listing.workspace_type === "meeting_room" || listing.workspace_type === "boardroom"
                ? "M 0,-11 11,0 0,11 -11,0 z"
                : "M -9,-9 9,-9 9,9 -9,9 z",
            fillColor: "#a21caf",
            fillOpacity: 0.92,
            strokeColor: isHighlighted ? "#f59e0b" : "#ffffff",
            strokeWeight: isHighlighted ? 3 : 2,
            scale: 1,
          },
        });
        marker.addListener("click", () => onSelect(listing));
        bounds.extend(marker.getPosition());
        return marker;
      }
      const lt = getListingType(listing);
      const fillColor = lt === "accommodation"
        ? (listing.verified_status ? "#0f766e" : "#e8790a")
        : (GOOGLE_LAYER_COLORS[lt] ?? "#475569");
      const circle = new googleApi.maps.Circle({
        map,
        center: { lat: listing.latitude, lng: listing.longitude },
        radius: isHighlighted ? 850 : 620,
        fillColor,
        fillOpacity: 0.88,
        strokeColor: isHighlighted ? "#f59e0b" : "#ffffff",
        strokeWeight: isHighlighted ? 3 : 2,
      });
      circle.addListener("click", () => onSelect(listing));
      bounds.extend(circle.getCenter());
      return circle;
    });

    const eventMarkers = events.map((event) => {
      const marker = new googleApi.maps.Marker({
        map,
        position: { lat: event.latitude, lng: event.longitude },
        title: event.name,
        icon: {
          path: "M0,-12 L2.8,-3.8 L11.4,-3.8 L4.5,1.5 L7.3,10 L0,5.1 L-7.3,10 L-4.5,1.5 L-11.4,-3.8 L-2.8,-3.8 z",
          fillColor: "#e11d48",
          fillOpacity: 0.95,
          strokeColor: selectedEventId === event.id ? "#fbbf24" : "#ffffff",
          strokeWeight: selectedEventId === event.id ? 2.5 : 1.8,
          scale: selectedEventId === event.id ? 1.25 : 1,
          anchor: new googleApi.maps.Point(0, 0),
        },
      });
      marker.addListener("click", () => onSelectEvent?.(event));
      bounds.extend(marker.getPosition());
      return marker;
    });

    if (listings.length + events.length > 1) map.fitBounds(bounds, 54);
    return () => {
      shapes.forEach((shape) => shape.setMap(null));
      eventMarkers.forEach((marker) => marker.setMap(null));
      servicePin?.setMap(null);
    };
  }, [events, highlightedListingIds, listings, onSelect, onSelectEvent, selectedEventId, selectedId, serviceMarker]);

  return <div className="h-full w-full" ref={targetRef} />;
}

export function MapCanvas({
  listings,
  events = [],
  selectedId,
  selectedEventId,
  onSelect,
  onSelectEvent,
  serviceMarker,
  region,
  flyTo,
  highlightedListingIds = [],
}: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [googleState, setGoogleState] = useState<GoogleState>(apiKey ? "loading" : "idle");

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => setGoogleState("ready")).catch(() => setGoogleState("failed"));
  }, [apiKey]);

  if (googleState === "ready") {
    return (
      <GoogleCircleMap
        listings={listings}
        events={events}
        selectedId={selectedId}
        selectedEventId={selectedEventId}
        onSelect={onSelect}
        onSelectEvent={onSelectEvent}
        serviceMarker={serviceMarker}
        highlightedListingIds={highlightedListingIds}
      />
    );
  }
  if (googleState === "loading") {
    return <div className="grid min-h-screen place-items-center bg-emerald-50 text-slate-700">Loading map…</div>;
  }
  return import.meta.env.VITE_MAP_MODE === "mock"
    ? (
      <MockMap
        listings={listings}
        events={events}
        selectedId={selectedId}
        selectedEventId={selectedEventId}
        onSelect={onSelect}
        onSelectEvent={onSelectEvent}
        serviceMarker={serviceMarker}
        region={region}
        highlightedListingIds={highlightedListingIds}
      />
    )
    : (
      <LeafletMap
        listings={listings}
        events={events}
        selectedId={selectedId}
        selectedEventId={selectedEventId}
        onSelect={onSelect}
        onSelectEvent={onSelectEvent}
        serviceMarker={serviceMarker}
        centerRegion={region}
        flyTo={flyTo}
        highlightedListingIds={highlightedListingIds}
      />
    );
}
