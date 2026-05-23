import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MapPinned } from "lucide-react";

import { BottomPanel } from "../components/BottomPanel";
import { FilterPanel } from "../components/FilterPanel";
import { JourneyPlannerModal } from "../components/JourneyPlannerModal";
import { ListingDetailDrawer } from "../components/ListingDetailDrawer";
import { MapCanvas } from "../components/MapCanvas";
import { SearchBar, type SearchAction } from "../components/SearchBar";
import { useListingFilters } from "../hooks/useListingFilters";
import { useFavourites } from "../hooks/useFavourites";
import { api } from "../services/api";
import type { Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";
import type { FlyTo } from "../components/LeafletMap";

const JHB: [number, number] = [-26.1076, 28.0567];

export function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing>();
  const [serviceMarker, setServiceMarker] = useState<ServiceMarker | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [flyTo, setFlyTo] = useState<FlyTo | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(JHB);
  const { filters, setFilters, filteredListings, suburbs } = useListingFilters(listings);
  const { ids: favouriteIds, isFavourite, toggle: toggleFavourite, count: favouriteCount } = useFavourites();

  const displayedListings = useMemo(
    () => filters.favouritesOnly ? filteredListings.filter((l) => favouriteIds.has(l.id)) : filteredListings,
    [filteredListings, filters.favouritesOnly, favouriteIds],
  );

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

  function handleResultSelect(action: SearchAction) {
    if (action.kind === "suburb") {
      const ft: FlyTo = { lat: action.lat, lng: action.lng, zoom: 13 };
      setFlyTo(ft);
      setMapCenter([action.lat, action.lng]);
    } else {
      const ft: FlyTo = { lat: action.listing.latitude, lng: action.listing.longitude, zoom: 15 };
      setFlyTo(ft);
      setMapCenter([action.listing.latitude, action.listing.longitude]);
      selectListing(action.listing);
    }
  }

  return (
    <>
      <nav className="fixed left-4 right-4 top-4 z-30 flex items-center gap-3 rounded-lg border border-white/70 bg-white/95 px-2 py-1 shadow-panel backdrop-blur">
        <div className="flex shrink-0 gap-1">
          <a className="nav-link nav-link-active" href="/" title="Map discovery">
            <MapPinned className="h-4 w-4" />Map
          </a>
          <a className="nav-link" href="/admin" title="Admin listings">
            <Building2 className="h-4 w-4" />Admin
          </a>
        </div>
        <div className="flex flex-1 justify-center">
          <SearchBar listings={listings} mapCenter={mapCenter} onResultSelect={handleResultSelect} />
        </div>
      </nav>
      <main className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapCanvas listings={displayedListings} selectedId={selected?.id} onSelect={selectListing} serviceMarker={serviceMarker} region={filters.region} flyTo={flyTo} />
        </div>
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-4 p-4 pt-16 md:flex-row md:items-start">
          <FilterPanel filters={filters} suburbs={suburbs} resultCount={displayedListings.length} favouriteCount={favouriteCount} onChange={setFilters} />
          <ListingDetailDrawer
            listing={selected}
            allListings={listings}
            onClose={() => { setSelected(undefined); setServiceMarker(null); }}
            onSelect={selectListing}
            onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
            onOpenPlanner={() => setPlannerOpen(true)}
            isFavourite={selected ? isFavourite(selected.id) : false}
            onToggleFavourite={toggleFavourite}
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
        {error && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700 shadow">
            {error}
          </p>
        )}
        {loading && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-white/90 px-4 py-2 text-sm text-slate-600 shadow backdrop-blur">
            Loading listings…
          </p>
        )}
      </main>
    </>
  );
}

