import { useEffect, useRef, useState } from "react";

import { isWorkspace, type Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";
import { LeafletMap } from "./LeafletMap";
import { MockMap } from "./MockMap";

type Props = {
  listings: Listing[];
  selectedId?: string;
  onSelect: (listing: Listing) => void;
  serviceMarker?: ServiceMarker | null;
};

type GoogleState = "idle" | "loading" | "ready" | "failed";

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

function GoogleCircleMap({ listings, selectedId, onSelect, serviceMarker }: Props) {
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

    const shapes = listings.map((listing) => {
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
            strokeColor: "#ffffff",
            strokeWeight: selectedId === listing.id ? 3 : 2,
            scale: 1,
          },
        });
        marker.addListener("click", () => onSelect(listing));
        bounds.extend(marker.getPosition());
        return marker;
      }
      const circle = new googleApi.maps.Circle({
        map,
        center: { lat: listing.latitude, lng: listing.longitude },
        radius: selectedId === listing.id ? 850 : 620,
        fillColor: listing.verified_status ? "#0f766e" : "#e8790a",
        fillOpacity: 0.88,
        strokeColor: "#ffffff",
        strokeWeight: selectedId === listing.id ? 3 : 2,
      });
      circle.addListener("click", () => onSelect(listing));
      bounds.extend(circle.getCenter());
      return circle;
    });
    if (listings.length > 1) map.fitBounds(bounds, 54);
    return () => {
      shapes.forEach((shape) => shape.setMap(null));
      servicePin?.setMap(null);
    };
  }, [listings, onSelect, selectedId, serviceMarker]);

  return <div className="h-full w-full" ref={targetRef} />;
}

export function MapCanvas(props: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [googleState, setGoogleState] = useState<GoogleState>(apiKey ? "loading" : "idle");

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => setGoogleState("ready")).catch(() => setGoogleState("failed"));
  }, [apiKey]);

  if (googleState === "ready") return <GoogleCircleMap {...props} />;
  if (googleState === "loading") {
    return <div className="grid min-h-screen place-items-center bg-emerald-50 text-slate-700">Loading map…</div>;
  }
  return import.meta.env.VITE_MAP_MODE === "mock" ? <MockMap {...props} /> : <LeafletMap {...props} />;
}
