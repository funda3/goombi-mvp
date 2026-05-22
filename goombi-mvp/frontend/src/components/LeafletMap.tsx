import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Map as LeafletMapInstance } from "leaflet";

import { isWorkspace, type Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";

type Props = {
  listings: Listing[];
  selectedId?: string;
  onSelect: (listing: Listing) => void;
  serviceMarker?: ServiceMarker | null;
  centerRegion?: string;
};

const JHB_CENTER: [number, number] = [-26.1076, 28.0567];
const CPT_CENTER: [number, number] = [-33.9249, 18.4241];
const SA_CENTER: [number, number] = [-30.5595, 22.9375];
const JHB_ZOOM = 11;
const SA_ZOOM = 5;

/** Captures the Leaflet map instance into a ref so controls outside MapContainer can call it. */
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMapInstance | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export function LeafletMap({ listings, selectedId, onSelect, serviceMarker, centerRegion }: Props) {
  const mapRef = useRef<LeafletMapInstance | null>(null);

  useEffect(() => {
    if (!mapRef.current || !centerRegion || centerRegion === "all") return;
    if (centerRegion === "Western Cape") {
      mapRef.current.setView(CPT_CENTER, JHB_ZOOM);
    } else {
      mapRef.current.setView(JHB_CENTER, JHB_ZOOM);
    }
  }, [centerRegion]);

  function fitResults() {
    if (!mapRef.current || listings.length === 0) return;
    const coords = listings.map((l) => [l.latitude, l.longitude] as [number, number]);
    mapRef.current.fitBounds(coords, { padding: [40, 40] });
  }

  function goToSA() {
    mapRef.current?.setView(SA_CENTER, SA_ZOOM);
  }

  function goToJHB() {
    mapRef.current?.setView(JHB_CENTER, JHB_ZOOM);
  }

  function workspacePolygon(listing: Listing): [number, number][] {
    const diamond = listing.workspace_type === "meeting_room" || listing.workspace_type === "boardroom";
    const offset = selectedId === listing.id ? 0.011 : 0.008;
    const { latitude, longitude } = listing;
    return diamond
      ? [
          [latitude - offset, longitude],
          [latitude, longitude + offset],
          [latitude + offset, longitude],
          [latitude, longitude - offset],
        ]
      : [
          [latitude - offset, longitude - offset],
          [latitude - offset, longitude + offset],
          [latitude + offset, longitude + offset],
          [latitude + offset, longitude - offset],
        ];
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
        {listings.map((listing) =>
          isWorkspace(listing) ? (
            <Polygon
              eventHandlers={{ click: () => onSelect(listing), mousedown: () => onSelect(listing) }}
              key={listing.id}
              pathOptions={{
                className: "goombi-workspace-shape",
                fillColor: "#a21caf",
                fillOpacity: 0.92,
                color: "#ffffff",
                weight: selectedId === listing.id ? 3 : 2,
              }}
              positions={workspacePolygon(listing)}
            >
              <Tooltip>{listing.name}</Tooltip>
            </Polygon>
          ) : (
            <CircleMarker
              key={listing.id}
              center={[listing.latitude, listing.longitude]}
              radius={selectedId === listing.id ? 16 : 12}
              pathOptions={{
                fillColor: listing.verified_status ? "#0f766e" : "#e8790a",
                fillOpacity: 0.88,
                color: "#ffffff",
                weight: selectedId === listing.id ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelect(listing) }}
            >
              <Tooltip>{listing.name}</Tooltip>
            </CircleMarker>
          ),
        )}
      </MapContainer>

      {/* Map control buttons rendered outside Leaflet's canvas for full React event handling */}
      <div
        className="absolute right-2 top-20 z-[1000] flex flex-col gap-1 rounded-lg border border-white/70 bg-white/95 p-1.5 shadow-panel"
        data-testid="leaflet-controls"
      >
        <button
          aria-label="Fit to results"
          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          disabled={listings.length === 0}
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
      </div>
    </div>
  );
}
