import { useEffect, useRef, useState } from "react";

import { fetchNearbyServices } from "../services/overpass";
import type { Listing } from "../types/listing";
import type { ServiceGroup } from "../types/services";
import { ServiceCard } from "./ServiceCard";

const JHB = { lat: -26.1076, lon: 28.0567 };

type Props = {
  selected?: Listing;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

export function BottomPanel({ selected, onShowOnMap }: Props) {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const serviceCacheRef = useRef(new Map<string, ServiceGroup[]>());

  const coordKey = selected
    ? `${selected.latitude.toFixed(4)},${selected.longitude.toFixed(4)}`
    : null;

  useEffect(() => {
    if (!selected) return;
    const key = coordKey!;
    const cached = serviceCacheRef.current.get(key);
    if (cached) { setServiceGroups(cached); return; }

    setServicesLoading(true);
    setServicesError(null);
    setServiceGroups([]);
    fetchNearbyServices(selected.latitude, selected.longitude)
      .then((data) => { serviceCacheRef.current.set(key, data); setServiceGroups(data); })
      .catch((err) => setServicesError(err instanceof Error ? err.message : "Failed to load services"))
      .finally(() => setServicesLoading(false));
  }, [coordKey, selected]);

  const hasServiceResults = serviceGroups.some((g) => g.nearest !== null);

  return (
    <section className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto rounded-lg border border-white/70 bg-white/95 shadow-panel md:bottom-4 md:left-[22rem] md:right-[27rem]">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nearby Services</p>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {!selected && (
          <p className="py-2 text-sm text-slate-500">Select a listing on the map to see nearby services.</p>
        )}

        {selected && servicesLoading && (
          <p className="py-2 text-sm text-slate-500">Fetching services from OpenStreetMap…</p>
        )}

        {selected && servicesError && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{servicesError}</p>
        )}

        {selected && !servicesLoading && !servicesError && hasServiceResults && (
          <>
            <p className="mb-2 text-xs text-slate-400">Near {selected.name} · within 5 km</p>
            <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto">
              {serviceGroups
                .filter((g) => g.nearest !== null)
                .map((g) => (
                  <ServiceCard key={g.category} group={g} onShowOnMap={onShowOnMap} />
                ))}
            </div>
          </>
        )}

        {selected && !servicesLoading && !servicesError && serviceGroups.length > 0 && !hasServiceResults && (
          <p className="py-2 text-sm text-slate-500">No services found within 5 km.</p>
        )}
      </div>
    </section>
  );
}
