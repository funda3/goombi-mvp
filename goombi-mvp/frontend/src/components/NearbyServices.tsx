import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { fetchNearbyServices } from "../services/overpass";
import type { Listing } from "../types/listing";
import type { ServiceGroup } from "../types/services";

type Props = {
  listing: Listing;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function NearbyServices({ listing, onShowOnMap }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const cacheRef = useRef(new Map<string, ServiceGroup[]>());

  useEffect(() => {
    setExpanded(false);
    setGroups([]);
    setError(null);
  }, [listing.id]);

  useEffect(() => {
    if (!expanded) return;
    const cached = cacheRef.current.get(listing.id);
    if (cached) { setGroups(cached); return; }

    setLoading(true);
    setError(null);
    fetchNearbyServices(listing.latitude, listing.longitude)
      .then((data) => {
        cacheRef.current.set(listing.id, data);
        setGroups(data);
      })
      .catch(() => setError("Nearby services unavailable."))
      .finally(() => setLoading(false));
  }, [expanded, listing.id, listing.latitude, listing.longitude]);

  const hasResults = groups.some((g) => g.nearest !== null);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700"
        onClick={() => setExpanded((e) => !e)}
      >
        <span>Nearby Services</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-3 grid gap-3">
          {loading && <p className="text-xs text-slate-500">Loading nearby services...</p>}
          {error && <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{error}</p>}

          {!loading && !error && groups.some((g) => g.nearest !== null) && (
            <ul className="grid gap-1.5">
              {groups
                .filter((g) => g.nearest !== null)
                .map((g) => (
                  <li key={g.category} className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs">
                    <span className="shrink-0 text-base leading-none">{g.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{g.nearest!.name}</p>
                      <p className="text-slate-500">{fmtDist(g.nearest!.distanceKm)}</p>
                    </div>
                    {onShowOnMap && (
                      <button
                        type="button"
                        className="shrink-0 rounded px-1.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        onClick={() => onShowOnMap(g.nearest!.lat, g.nearest!.lon, `${g.emoji} ${g.nearest!.name}`)}
                      >
                        Map
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          )}

          {!loading && !error && !hasResults && (
            <p className="text-xs text-slate-500">No nearby services found.</p>
          )}
        </div>
      )}
    </div>
  );
}
