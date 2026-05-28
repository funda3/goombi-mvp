import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { fetchNearbyServices } from "../services/overpass";
import type { Listing } from "../types/listing";
import type { NearbyServicesResult, ServiceGroup } from "../types/services";

type Props = {
  listing: Listing;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

function fmtDist(km: number, approximate: boolean): string {
  const distance = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  return approximate ? `Approx. ${distance}` : distance;
}

export function NearbyServices({ listing, onShowOnMap }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<NearbyServicesResult["status"]>("empty");
  const [message, setMessage] = useState<string>("Nearby services require listing coordinates.");
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const cacheRef = useRef(new Map<string, NearbyServicesResult>());
  const hasCoordinates = Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude);

  useEffect(() => {
    setExpanded(false);
    setGroups([]);
    setStatus("empty");
    setMessage("Nearby services require listing coordinates.");
  }, [listing.id]);

  useEffect(() => {
    if (!expanded) return;
    const cached = cacheRef.current.get(listing.id);
    if (cached) {
      setGroups(cached.services);
      setStatus(cached.status);
      setMessage(cached.message);
      return;
    }

    setLoading(true);
    fetchNearbyServices({
      lat: listing.latitude,
      lon: listing.longitude,
      province: listing.province,
      city: listing.city,
      suburb: listing.suburb,
    })
      .then((result) => {
        cacheRef.current.set(listing.id, result);
        setGroups(result.services);
        setStatus(result.status);
        setMessage(result.message);
      })
      .finally(() => setLoading(false));
  }, [expanded, listing.city, listing.id, listing.latitude, listing.longitude, listing.province, listing.suburb]);

  const hasResults = groups.some((g) => g.nearest !== null);
  const demoMode = status === "fallback";
  const fallbackBadge = "Fallback estimate";

  return (
    <div className="mt-4 border-t border-slate-200 pt-4" data-testid="nearby-services-panel">
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

          {!loading && demoMode && hasResults && (
            <p className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Demo-safe nearby estimates
            </p>
          )}

          {!loading && hasResults && (
            <ul className="grid gap-1.5">
              {groups
                .filter((g) => g.nearest !== null)
                .map((g) => (
                  <li key={g.category} className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs" data-testid="nearby-service-card">
                    {g.emoji && <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{g.emoji}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{g.nearest!.name}</p>
                      <p className="text-slate-500">{fmtDist(g.nearest!.distanceKm, demoMode || Boolean(g.nearest!.isFallback))}</p>
                      {(demoMode || g.nearest!.isFallback) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span
                            className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                            data-testid="nearby-fallback-badge"
                          >
                            {g.nearest!.badgeLabel || fallbackBadge}
                          </span>
                          <span className="text-[11px] text-amber-700">
                            {g.nearest!.reason || "External nearby service provider unavailable"}
                          </span>
                        </div>
                      )}
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

          {!loading && !hasResults && status === "fallback" && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">Demo-safe nearby estimates shown.</p>
          )}

          {!loading && !hasResults && status === "empty" && !hasCoordinates && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">Nearby services require listing coordinates.</p>
          )}

          {!loading && !hasResults && status === "live" && (
            <p className="text-xs text-slate-500">No nearby services found.</p>
          )}

          {!loading && !hasResults && status === "empty" && hasCoordinates && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700" data-testid="nearby-services-unavailable">{message || "Demo-safe nearby estimates shown."}</p>
          )}
        </div>
      )}
    </div>
  );
}
