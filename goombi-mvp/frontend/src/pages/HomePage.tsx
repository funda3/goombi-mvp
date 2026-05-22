import { useCallback, useEffect, useState } from "react";

import { BottomPanel } from "../components/BottomPanel";
import { FilterPanel } from "../components/FilterPanel";
import { JourneyPlannerModal } from "../components/JourneyPlannerModal";
import { ListingDetailDrawer } from "../components/ListingDetailDrawer";
import { MapCanvas } from "../components/MapCanvas";
import { useListingFilters } from "../hooks/useListingFilters";
import { api } from "../services/api";
import type { Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";


export function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing>();
  const [serviceMarker, setServiceMarker] = useState<ServiceMarker | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { filters, setFilters, filteredListings, suburbs } = useListingFilters(listings);

  useEffect(() => {
    api.listings()
      .then(setListings)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Listings failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const selectListing = useCallback((listing: Listing) => {
    setSelected(listing);
    setServiceMarker(null);
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Map fills the background at z-0 so all UI overlays sit above it */}
      <div className="absolute inset-0 z-0">
        <MapCanvas listings={filteredListings} selectedId={selected?.id} onSelect={selectListing} serviceMarker={serviceMarker} region={filters.region} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-4 p-4 pt-24 md:flex-row md:items-start">
        <FilterPanel filters={filters} suburbs={suburbs} resultCount={filteredListings.length} onChange={setFilters} />
        <ListingDetailDrawer
          listing={selected}
          allListings={listings}
          onClose={() => { setSelected(undefined); setServiceMarker(null); }}
          onSelect={selectListing}
          onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
          onOpenPlanner={() => setPlannerOpen(true)}
        />
      </div>
      <BottomPanel
        selected={selected}
        onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
      />
      {plannerOpen && selected && (
        <JourneyPlannerModal
          selected={selected}
          allListings={listings}
          onClose={() => setPlannerOpen(false)}
        />
      )}
    </main>
  );
}

