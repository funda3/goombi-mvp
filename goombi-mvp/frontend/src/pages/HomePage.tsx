import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MapPinned, SlidersHorizontal } from "lucide-react";

import { BottomPanel } from "../components/BottomPanel";
import { EventDetailSheet } from "../components/EventDetailSheet";
import { EventsNearbyPanel } from "../components/EventsNearbyPanel";
import { FilterPanel } from "../components/FilterPanel";
import { JourneyPlannerModal } from "../components/JourneyPlannerModal";
import { ListingDetailDrawer } from "../components/ListingDetailDrawer";
import { MapLegend } from "../components/MapLegend";
import { MapCanvas } from "../components/MapCanvas";
import { SearchBar, type SearchAction } from "../components/SearchBar";
import { useListingFilters } from "../hooks/useListingFilters";
import { useFavourites } from "../hooks/useFavourites";
import { api } from "../services/api";
import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";
import type { ServiceMarker } from "../types/services";
import type { FlyTo } from "../components/LeafletMap";
import { haversineKm } from "../utils/haversine";

const JHB: [number, number] = [-26.1076, 28.0567];

export function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selected, setSelected] = useState<Listing>();
  const [selectedEvent, setSelectedEvent] = useState<EventRecord>();
  const [serviceMarker, setServiceMarker] = useState<ServiceMarker | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
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

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesRegion = filters.region === "all" || event.province === filters.region;
        const matchesCategory = filters.eventCategory === "all" || event.category === filters.eventCategory;
        return matchesRegion && matchesCategory;
      }),
    [events, filters.eventCategory, filters.region],
  );

  const nearbyForEvent = useMemo(() => {
    if (!selectedEvent) return [];
    return listings
      .filter((listing) => {
        const isStayOrWorkspace = listing.category === "workspace" || listing.category === "accommodation" || listing.category === "bnb" || listing.category === "guesthouse";
        if (!isStayOrWorkspace) return false;
        const distanceKm = haversineKm(selectedEvent.latitude, selectedEvent.longitude, listing.latitude, listing.longitude);
        return distanceKm <= 5;
      })
      .sort((a, b) => {
        const aDistance = haversineKm(selectedEvent.latitude, selectedEvent.longitude, a.latitude, a.longitude);
        const bDistance = haversineKm(selectedEvent.latitude, selectedEvent.longitude, b.latitude, b.longitude);
        return aDistance - bDistance;
      })
      .slice(0, 6);
  }, [listings, selectedEvent]);

  const highlightedListingIds = useMemo(() => nearbyForEvent.map((item) => item.id), [nearbyForEvent]);

  const mapListings = useMemo(() => {
    if (filters.category !== "events") return displayedListings;
    if (highlightedListingIds.length === 0) return [];
    const highlighted = listings.filter((listing) => highlightedListingIds.includes(listing.id));
    return highlighted;
  }, [displayedListings, filters.category, highlightedListingIds, listings]);

  const mapEvents = useMemo(
    () => (filters.category === "accommodation" || filters.category === "workspace" ? [] : filteredEvents),
    [filteredEvents, filters.category],
  );

  useEffect(() => {
    Promise.all([api.listings(), api.events()])
      .then(([listingData, eventData]) => {
        setListings(listingData);
        setEvents(eventData);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Listings failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const selectListing = useCallback((listing: Listing) => {
    setSelected(listing);
    setSelectedEvent(undefined);
    setServiceMarker(null);
  }, []);

  const selectEvent = useCallback((event: EventRecord) => {
    setSelected(undefined);
    setServiceMarker(null);
    setSelectedEvent(event);
    setFlyTo({ lat: event.latitude, lng: event.longitude, zoom: 13 });
    setMapCenter([event.latitude, event.longitude]);
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
      <nav className="fixed left-4 right-4 top-4 z-30 rounded-lg border border-white/70 bg-white/95 shadow-panel backdrop-blur">
        {/* Mobile: two-row layout */}
        <div className="flex flex-col gap-1.5 p-1.5 md:hidden">
          <div className="flex items-center gap-1">
            <a className="nav-link nav-link-active" href="/" title="Map discovery">
              <MapPinned className="h-4 w-4" />Map
            </a>
            <a className="nav-link" href="/admin" title="Admin listings">
              <Building2 className="h-4 w-4" />Admin
            </a>
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
          <SearchBar listings={listings} mapCenter={mapCenter} onResultSelect={handleResultSelect} />
        </div>
        {/* Desktop: single-row layout */}
        <div className="hidden md:flex md:items-center md:gap-3 md:px-2 md:py-1">
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
        </div>
      </nav>
      <main className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapCanvas
            listings={mapListings}
            events={mapEvents}
            selectedId={selected?.id}
            selectedEventId={selectedEvent?.id}
            onSelect={selectListing}
            onSelectEvent={selectEvent}
            highlightedListingIds={highlightedListingIds}
            serviceMarker={serviceMarker}
            region={filters.region}
            flyTo={flyTo}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-4 p-4 pt-16 md:flex-row md:items-start">
          <FilterPanel
            filters={filters}
            suburbs={suburbs}
            resultCount={displayedListings.length + mapEvents.length}
            favouriteCount={favouriteCount}
            onChange={setFilters}
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
          />
        </div>
        <EventsNearbyPanel
          events={filteredEvents}
          selectedProvince={filters.region}
          selectedEventId={selectedEvent?.id}
          onSelectEvent={selectEvent}
        />
        <MapLegend />
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
        <BottomPanel
          selected={selected}
          onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
        />
        <EventDetailSheet
          event={selectedEvent}
          allListings={listings}
          onClose={() => setSelectedEvent(undefined)}
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
