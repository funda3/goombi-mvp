import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { driveMinutes, haversineKm } from "../utils/haversine";
import { fetchNearbyServices } from "../services/overpass";
import { isWorkspace, type Listing } from "../types/listing";
import type { ServiceGroup } from "../types/services";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StopCategory = "gym" | "restaurant" | "supermarket";

const STOP_OPTIONS: { cat: StopCategory; emoji: string; label: string }[] = [
  { cat: "gym",         emoji: "🏋️", label: "Gym" },
  { cat: "restaurant",  emoji: "🍽️", label: "Coffee / Eat" },
  { cat: "supermarket", emoji: "🛍️", label: "Supermarket" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function sortByDistFrom(listings: Listing[], refLat: number, refLon: number): Listing[] {
  return [...listings].sort(
    (a, b) =>
      haversineKm(refLat, refLon, a.latitude, a.longitude) -
      haversineKm(refLat, refLon, b.latitude, b.longitude),
  );
}

function selectLabel(l: Listing, refLat?: number, refLon?: number): string {
  const dist =
    refLat !== undefined && refLon !== undefined
      ? ` · ${fmtDist(haversineKm(refLat, refLon, l.latitude, l.longitude))}`
      : "";
  return `${l.name} — ${l.suburb}${dist}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  selected: Listing;
  allListings: Listing[];
  onClose: () => void;
};

export function JourneyPlannerModal({ selected, allListings, onClose }: Props) {
  const [stayAt, setStayAt] = useState<Listing | null>(
    isWorkspace(selected) ? null : selected,
  );
  const [workAt, setWorkAt] = useState<Listing | null>(
    isWorkspace(selected) ? selected : null,
  );
  const [stopCat, setStopCat] = useState<StopCategory | null>(null);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const cacheRef = useRef(new Map<string, ServiceGroup[]>());

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch nearby services for stop options — keyed to stayAt (or selected) coords
  const fetchLat = stayAt?.latitude ?? selected.latitude;
  const fetchLon = stayAt?.longitude ?? selected.longitude;

  useEffect(() => {
    const key = `${fetchLat.toFixed(4)},${fetchLon.toFixed(4)}`;
    const cached = cacheRef.current.get(key);
    if (cached) { setServiceGroups(cached); return; }

    setServicesLoading(true);
    fetchNearbyServices(fetchLat, fetchLon)
      .then((data) => { cacheRef.current.set(key, data); setServiceGroups(data); })
      .catch(() => setServiceGroups([]))
      .finally(() => setServicesLoading(false));
  }, [fetchLat, fetchLon]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const accommodations = useMemo(() => {
    const all = allListings.filter((l) => !isWorkspace(l));
    return workAt ? sortByDistFrom(all, workAt.latitude, workAt.longitude) : all;
  }, [allListings, workAt]);

  const workspaces = useMemo(() => {
    const all = allListings.filter(isWorkspace);
    return stayAt ? sortByDistFrom(all, stayAt.latitude, stayAt.longitude) : all;
  }, [allListings, stayAt]);

  const directDist =
    stayAt && workAt
      ? haversineKm(stayAt.latitude, stayAt.longitude, workAt.latitude, workAt.longitude)
      : null;

  const stopGroup = stopCat
    ? (serviceGroups.find((g) => g.category === stopCat) ?? null)
    : null;
  const stopItem = stopGroup?.nearest ?? null;

  const stopFromStay =
    stopItem != null
      ? haversineKm(fetchLat, fetchLon, stopItem.lat, stopItem.lon)
      : null;

  const withStopDist =
    stayAt && workAt && stopItem != null
      ? haversineKm(stayAt.latitude, stayAt.longitude, stopItem.lat, stopItem.lon) +
        haversineKm(stopItem.lat, stopItem.lon, workAt.latitude, workAt.longitude)
      : null;

  const extraDist =
    withStopDist != null && directDist != null ? withStopDist - directDist : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">🗺️ Plan my journey</h2>
          <button
            aria-label="Close planner"
            className="secondary-button h-8 w-8 p-0"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          {/* Stay at */}
          <label className="label">
            🏠 I will stay at
            <select
              className="field"
              value={stayAt?.id ?? ""}
              onChange={(e) =>
                setStayAt(allListings.find((l) => l.id === e.target.value) ?? null)
              }
            >
              <option value="">— Select accommodation —</option>
              {accommodations.map((l) => (
                <option key={l.id} value={l.id}>
                  {selectLabel(l, workAt?.latitude, workAt?.longitude)}
                </option>
              ))}
            </select>
          </label>

          {/* Work at */}
          <label className="label">
            💼 I will work at
            <select
              className="field"
              value={workAt?.id ?? ""}
              onChange={(e) =>
                setWorkAt(allListings.find((l) => l.id === e.target.value) ?? null)
              }
            >
              <option value="">— Select workspace —</option>
              {workspaces.map((l) => (
                <option key={l.id} value={l.id}>
                  {selectLabel(l, stayAt?.latitude, stayAt?.longitude)}
                </option>
              ))}
            </select>
          </label>

          {/* Journey summary */}
          {directDist !== null && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">
                📍 {fmtDist(directDist)} &nbsp;·&nbsp; ~{driveMinutes(directDist)} min drive
              </p>
              <p className="mt-0.5 text-xs text-emerald-600">
                Straight-line estimate at 30 km/h urban average
              </p>
            </div>
          )}

          {/* Optional stop */}
          <div>
            <p className="label mb-2">Add a stop (optional)</p>
            <div className="flex gap-2">
              {STOP_OPTIONS.map(({ cat, emoji, label }) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStopCat((prev) => (prev === cat ? null : cat))}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                    stopCat === cat
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg leading-none">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            {stopCat && (
              <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                {servicesLoading && (
                  <p className="text-slate-500">Loading nearby stops…</p>
                )}
                {!servicesLoading && !stopItem && (
                  <p className="text-slate-500">
                    No {stopCat === "restaurant" ? "café or restaurant" : stopCat} found within 5 km.
                  </p>
                )}
                {!servicesLoading && stopItem && (
                  <div className="grid gap-1">
                    <p className="font-semibold text-slate-800">
                      {stopGroup?.emoji} {stopItem.name}
                    </p>
                    {stopFromStay !== null && (
                      <p className="text-slate-500">
                        {fmtDist(stopFromStay)} from {stayAt ? "stay" : "your location"}
                      </p>
                    )}
                    {withStopDist !== null && (
                      <p className="mt-1 font-medium text-slate-800">
                        Total: {fmtDist(withStopDist)} · ~{driveMinutes(withStopDist)} min
                        {extraDist !== null && extraDist > 0.05 && (
                          <span className="font-normal text-slate-500">
                            {" "}(+{fmtDist(extraDist)} detour)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          All distances are straight-line (Haversine). Actual drive times will vary.
        </p>
      </div>
    </div>
  );
}
