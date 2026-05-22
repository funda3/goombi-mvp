import { useMemo } from "react";
import { MapPin, Clock } from "lucide-react";

import { driveMinutes, haversineKm } from "../utils/haversine";
import { isWorkspace, type Listing } from "../types/listing";

type NearbyItem = {
  listing: Listing;
  distanceKm: number;
  driveMin: number;
};

type Props = {
  selected: Listing;
  allListings: Listing[];
  onSelect: (listing: Listing) => void;
};

function typeLabel(listing: Listing): string {
  if (isWorkspace(listing)) {
    return listing.workspace_type?.replace(/_/g, " ") ?? "workspace";
  }
  return listing.accommodation_type ?? listing.category;
}

export function NearbyListings({ selected, allListings, onSelect }: Props) {
  const nearby = useMemo<NearbyItem[]>(() => {
    const wantWorkspace = !isWorkspace(selected);
    return allListings
      .filter((l) => l.id !== selected.id && isWorkspace(l) === wantWorkspace)
      .map((l) => ({
        listing: l,
        distanceKm: haversineKm(selected.latitude, selected.longitude, l.latitude, l.longitude),
        driveMin: 0,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3)
      .map((item) => ({ ...item, driveMin: driveMinutes(item.distanceKm) }));
  }, [selected, allListings]);

  if (nearby.length === 0) return null;

  const heading = isWorkspace(selected)
    ? "Nearby Accommodation"
    : "Nearby Workspaces";

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{heading}</h3>
      <ul className="grid gap-2">
        {nearby.map(({ listing, distanceKm, driveMin }) => (
          <li key={listing.id}>
            <button
              type="button"
              onClick={() => onSelect(listing)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{listing.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-slate-500">{typeLabel(listing)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {distanceKm < 1
                      ? `${Math.round(distanceKm * 1000)} m`
                      : `${distanceKm.toFixed(1)} km`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{driveMin} min
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
