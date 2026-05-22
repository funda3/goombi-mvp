import { useMemo, useEffect, useRef, useState } from "react";

import { fetchNearbyServices } from "../services/overpass";
import { isWorkspace, type Listing } from "../types/listing";
import type { ServiceGroup } from "../types/services";
import { ListingCard } from "./ListingCard";
import { ServiceCard } from "./ServiceCard";
import { WorkspaceCard } from "./WorkspaceCard";

type BottomTab = "all" | "accommodation" | "workspaces" | "services";

const TABS: { id: BottomTab; label: string }[] = [
  { id: "all",           label: "All" },
  { id: "accommodation", label: "Accommodation" },
  { id: "workspaces",    label: "Workspaces" },
  { id: "services",      label: "Services" },
];

const JHB = { lat: -26.1076, lon: 28.0567 };

type Props = {
  listings: Listing[];
  selected?: Listing;
  loading: boolean;
  error: string;
  onSelect: (listing: Listing) => void;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

export function BottomPanel({ listings, selected, loading, error, onSelect, onShowOnMap }: Props) {
  const [activeTab, setActiveTab] = useState<BottomTab>("all");
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const serviceCacheRef = useRef(new Map<string, ServiceGroup[]>());

  const coordKey = selected
    ? `${selected.latitude.toFixed(4)},${selected.longitude.toFixed(4)}`
    : `${JHB.lat.toFixed(4)},${JHB.lon.toFixed(4)}`;

  useEffect(() => {
    if (activeTab !== "services") return;
    const cached = serviceCacheRef.current.get(coordKey);
    if (cached) { setServiceGroups(cached); return; }

    const lat = selected?.latitude ?? JHB.lat;
    const lon = selected?.longitude ?? JHB.lon;
    setServicesLoading(true);
    setServicesError(null);
    setServiceGroups([]);
    fetchNearbyServices(lat, lon)
      .then((data) => { serviceCacheRef.current.set(coordKey, data); setServiceGroups(data); })
      .catch((err) => setServicesError(err instanceof Error ? err.message : "Failed to load services"))
      .finally(() => setServicesLoading(false));
  }, [activeTab, coordKey, selected?.latitude, selected?.longitude]);

  const visibleListings = useMemo(() => {
    if (activeTab === "accommodation") return listings.filter((l) => !isWorkspace(l));
    if (activeTab === "workspaces") return listings.filter(isWorkspace);
    return listings;
  }, [activeTab, listings]);

  const hasServiceResults = serviceGroups.some((g) => g.nearest !== null);
  const isListingTab = activeTab !== "services";

  return (
    <section className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto rounded-lg border border-white/70 bg-white/95 shadow-panel md:bottom-4 md:left-[22rem] md:right-[27rem]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === id
                ? "bg-emerald-700 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card area */}
      <div className="px-3 pb-3">
        {/* Listing tabs — horizontal scroll */}
        {isListingTab && loading && (
          <p className="py-2 text-sm text-slate-600">Loading demo listings…</p>
        )}
        {isListingTab && error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
        )}
        {isListingTab && !loading && !error && visibleListings.length === 0 && (
          <p className="py-2 text-sm text-slate-500">No listings match the current filters.</p>
        )}
        {isListingTab && !loading && !error && visibleListings.length > 0 && (
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px]">
            {visibleListings.map((listing) => (
              <div key={listing.id} className="w-full">
                {isWorkspace(listing)
                  ? <WorkspaceCard listing={listing} onSelect={onSelect} />
                  : <ListingCard listing={listing} onSelect={onSelect} />}
              </div>
            ))}
          </div>
        )}

        {/* Services tab — 2-col grid */}
        {!isListingTab && (
          <>
            {servicesLoading && (
              <p className="py-2 text-sm text-slate-500">Fetching services from OpenStreetMap…</p>
            )}
            {servicesError && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{servicesError}</p>
            )}
            {!servicesLoading && !servicesError && hasServiceResults && (
              <>
                <p className="mb-2 text-xs text-slate-400">
                  {selected ? `Near ${selected.name}` : "Near Johannesburg centre"} · within 5 km
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {serviceGroups
                    .filter((g) => g.nearest !== null)
                    .map((g) => (
                      <ServiceCard key={g.category} group={g} onShowOnMap={onShowOnMap} />
                    ))}
                </div>
              </>
            )}
            {!servicesLoading && !servicesError && serviceGroups.length > 0 && !hasServiceResults && (
              <p className="py-2 text-sm text-slate-500">No services found within 5 km.</p>
            )}
            {!servicesLoading && !servicesError && serviceGroups.length === 0 && (
              <p className="py-2 text-sm text-slate-500">
                Select a listing or click Services to load nearby facilities.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
