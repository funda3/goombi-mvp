import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

import { useIsMobile } from "../hooks/useIsMobile";
import { fetchNearbyServices } from "../services/overpass";
import type { SelectedNearbyTarget } from "../types/nearbyTarget";
import type { NearbyServicesResult, ServiceGroup } from "../types/services";
import { ServiceCard } from "./ServiceCard";

type Props = {
  selectedTarget?: SelectedNearbyTarget;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

export function BottomPanel({ selectedTarget, onShowOnMap }: Props) {
  const isMobile = useIsMobile();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesStatus, setServicesStatus] = useState<NearbyServicesResult["status"]>("empty");
  const [servicesMessage, setServicesMessage] = useState("Nearby services require listing coordinates.");
  const serviceCacheRef = useRef(new Map<string, NearbyServicesResult>());

  const hasCoordinates = selectedTarget
    ? Number.isFinite(selectedTarget.latitude) && Number.isFinite(selectedTarget.longitude)
    : false;

  const coordKey = selectedTarget && hasCoordinates
    ? `${selectedTarget.sourceType}:${selectedTarget.id}:${selectedTarget.latitude.toFixed(4)},${selectedTarget.longitude.toFixed(4)}`
    : null;

  useEffect(() => {
    setMobileExpanded(false);
  }, [selectedTarget?.id]);

  useEffect(() => {
    if (!selectedTarget) return;
    if (!hasCoordinates || !coordKey) {
      setServiceGroups([]);
      setServicesStatus("empty");
      setServicesMessage("Nearby services require listing coordinates.");
      return;
    }

    const cached = serviceCacheRef.current.get(coordKey);
    if (cached) {
      setServiceGroups(cached.services);
      setServicesStatus(cached.status);
      setServicesMessage(cached.message);
      return;
    }

    setServicesLoading(true);
    setServicesStatus("empty");
    setServicesMessage("Nearby services require listing coordinates.");
    setServiceGroups([]);
    fetchNearbyServices({
      lat: selectedTarget.latitude,
      lon: selectedTarget.longitude,
      province: selectedTarget.province,
      city: selectedTarget.city,
      suburb: selectedTarget.suburb,
    })
      .then((result) => {
        serviceCacheRef.current.set(coordKey, result);
        setServiceGroups(result.services);
        setServicesStatus(result.status);
        setServicesMessage(result.message);
      })
      .finally(() => setServicesLoading(false));
  }, [coordKey, hasCoordinates, selectedTarget]);

  const hasServiceResults = serviceGroups.some((g) => g.nearest !== null);
  const isFallback = servicesStatus === "fallback";

  const serviceContent = (
    <div className="px-3 pb-3">
      {!selectedTarget && (
        <p className="py-2 text-sm text-slate-500">Select a marker on the map to see nearby services.</p>
      )}
      {selectedTarget && servicesLoading && (
        <p className="py-2 text-sm text-slate-500">Loading nearby services...</p>
      )}
      {selectedTarget && !servicesLoading && isFallback && hasServiceResults && (
        <p className="mb-2 inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Demo-safe nearby estimates
        </p>
      )}
      {selectedTarget && !servicesLoading && hasServiceResults && (
        <>
          <p className="mb-2 text-xs text-slate-400">
            Near {selectedTarget.name} - within 5 km
            {isFallback ? " - fallback estimates shown" : ""}
          </p>
          <div className="grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto">
            {serviceGroups
              .filter((g) => g.nearest !== null)
              .map((g) => (
                <ServiceCard key={g.category} group={g} onShowOnMap={onShowOnMap} demoMode={isFallback} />
              ))}
          </div>
        </>
      )}
      {selectedTarget && !servicesLoading && servicesStatus === "fallback" && !hasServiceResults && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">Demo-safe nearby estimates shown.</p>
      )}
      {selectedTarget && !servicesLoading && servicesStatus === "live" && serviceGroups.length > 0 && !hasServiceResults && (
        <p className="py-2 text-sm text-slate-500">No nearby services found.</p>
      )}
      {selectedTarget && !servicesLoading && servicesStatus === "empty" && !hasCoordinates && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">Nearby services require listing coordinates.</p>
      )}
      {selectedTarget && !servicesLoading && servicesStatus === "empty" && hasCoordinates && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{servicesMessage || "Demo-safe nearby estimates shown."}</p>
      )}
    </div>
  );

  if (isMobile) {
    if (!selectedTarget) return null;

    return (
      <>
        {mobileExpanded && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileExpanded(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col overflow-hidden rounded-t-2xl bg-white/95 shadow-panel backdrop-blur">
              <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nearby Services</p>
                <button
                  type="button"
                  aria-label="Close nearby services"
                  className="secondary-button h-8 w-8 p-0"
                  onClick={() => setMobileExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{serviceContent}</div>
            </div>
          </>
        )}
        {!mobileExpanded && (
          <button
            type="button"
            className="pointer-events-auto fixed left-4 z-[25] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-panel backdrop-blur"
            style={{ bottom: "calc(60vh + 1rem)" }}
            onClick={() => setMobileExpanded(true)}
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            Nearby
          </button>
        )}
      </>
    );
  }

  return (
    <section className="pointer-events-auto absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-white/70 bg-white/95 shadow-panel md:left-[22rem]">
      <div className="px-3 pb-2 pt-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nearby Services</p>
      </div>
      {serviceContent}
    </section>
  );
}
