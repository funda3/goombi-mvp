import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MapPinned, SlidersHorizontal } from "lucide-react";

import { BottomPanel } from "../components/BottomPanel";
import { EventDetailSheet } from "../components/EventDetailSheet";
import { FilterPanel } from "../components/FilterPanel";
import { JourneyPlannerModal } from "../components/JourneyPlannerModal";
import { ListingDetailDrawer } from "../components/ListingDetailDrawer";
import { MapLegend } from "../components/MapLegend";
import { MapCanvas } from "../components/MapCanvas";
import { NightlifeDetailSheet } from "../components/NightlifeDetailSheet";
import { SearchBar, type SearchAction } from "../components/SearchBar";
import { useListingFilters } from "../hooks/useListingFilters";
import { useFavourites } from "../hooks/useFavourites";
import { api } from "../services/api";
import type { EventRecord } from "../types/event";
import { getListingType, type Listing } from "../types/listing";
import type { NightlifeVenue } from "../types/nightlife";
import type { SelectedNearbyTarget } from "../types/nearbyTarget";
import type {
  RestaurantProspectPublicCounts,
  RestaurantProspectPublicMarker,
} from "../types/restaurantProspect";
import type { ServiceMarker } from "../types/services";
import type { FlyTo } from "../components/LeafletMap";
import { haversineKm } from "../utils/haversine";
import { appHref } from "../utils/routes";

const JHB: [number, number] = [-26.1076, 28.0567];

function showRestaurantProspectsOnMap(): boolean {
  return ["1", "true", "yes", "on"].includes(
    String(import.meta.env.VITE_SHOW_RESTAURANT_PROSPECTS_ON_MAP ?? "").trim().toLowerCase(),
  );
}

function toDemoRestaurantListing(marker: RestaurantProspectPublicMarker): Listing {
  const timestamp = new Date().toISOString();
  return {
    id: `demo-prospect-${marker.id}`,
    name: marker.name,
    category: "restaurant",
    listing_type: "restaurant",
    approval_status: marker.approval_status,
    demo_visibility: marker.demo_visibility,
    province: marker.province,
    city: marker.city,
    suburb: marker.suburb,
    address: `${marker.suburb}, ${marker.city}`,
    latitude: marker.latitude,
    longitude: marker.longitude,
    price_per_night: 0,
    max_guests: null,
    rooms: null,
    description: "Demo prospect marker for provider approval workflow.",
    short_description: "Demo prospect marker for provider approval workflow.",
    long_description: "Provider approval pending.",
    amenities: [],
    photos: [],
    images: [],
    tags: [],
    owner_name: "",
    owner_phone: "",
    cuisine_tags: marker.cuisine_tags,
    price_band_goombi: marker.price_band ?? null,
    provider_type: marker.cuisine_tags.join(", "),
    verified_status: false,
    source_type: "manual_seed",
    source_note: "Internal demo prospect marker.",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [nightlife, setNightlife] = useState<NightlifeVenue[]>([]);
  const [restaurantCounts, setRestaurantCounts] = useState<RestaurantProspectPublicCounts | null>(null);
  const [selected, setSelected] = useState<Listing>();
  const [selectedEvent, setSelectedEvent] = useState<EventRecord>();
  const [selectedNightlife, setSelectedNightlife] = useState<NightlifeVenue>();
  const [selectedNearbyTarget, setSelectedNearbyTarget] = useState<SelectedNearbyTarget>();
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

  const filteredNightlife = useMemo(
    () =>
      nightlife.filter((venue) => {
        const matchesRegion = filters.region === "all" || venue.province === filters.region;
        const matchesTier = filters.nightlifeTier === "all" || venue.nightlife_tier === filters.nightlifeTier;
        const matchesMusicFocus = filters.nightlifeMusicFocus === "all" || venue.music_focus.includes(filters.nightlifeMusicFocus);
        const matchesVenueType = filters.nightlifeVenueType === "all" || venue.venue_type === filters.nightlifeVenueType;
        return matchesRegion && matchesTier && matchesMusicFocus && matchesVenueType;
      }),
    [filters.nightlifeMusicFocus, filters.nightlifeTier, filters.nightlifeVenueType, filters.region, nightlife],
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

  const nearbyForNightlife = useMemo(() => {
    if (!selectedNightlife) return [];
    return listings
      .filter((listing) => {
        const isStayOrWorkspace = listing.category === "workspace" || listing.category === "accommodation" || listing.category === "bnb" || listing.category === "guesthouse";
        if (!isStayOrWorkspace) return false;
        const distanceKm = haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, listing.latitude, listing.longitude);
        return distanceKm <= 5;
      })
      .sort((a, b) => {
        const aDistance = haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, a.latitude, a.longitude);
        const bDistance = haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, b.latitude, b.longitude);
        return aDistance - bDistance;
      })
      .slice(0, 8);
  }, [listings, selectedNightlife]);

  const nearbyEventsForNightlife = useMemo(() => {
    if (!selectedNightlife) return [];
    return events
      .filter((event) => haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, event.latitude, event.longitude) <= 10)
      .sort((a, b) => {
        const aDistance = haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, a.latitude, a.longitude);
        const bDistance = haversineKm(selectedNightlife.latitude, selectedNightlife.longitude, b.latitude, b.longitude);
        return aDistance - bDistance;
      })
      .slice(0, 10);
  }, [events, selectedNightlife]);

  const highlightedListingIds = useMemo(() => {
    const ids = new Set<string>();
    nearbyForEvent.forEach((item) => ids.add(item.id));
    nearbyForNightlife.forEach((item) => ids.add(item.id));
    return Array.from(ids);
  }, [nearbyForEvent, nearbyForNightlife]);

  const highlightedEventIds = useMemo(
    () => nearbyEventsForNightlife.map((item) => item.id),
    [nearbyEventsForNightlife],
  );

  const mapListings = useMemo(() => {
    if (filters.category !== "events" && filters.category !== "nightlife") return displayedListings;
    if (highlightedListingIds.length === 0) return [];
    const highlighted = listings.filter((listing) => highlightedListingIds.includes(listing.id));
    return highlighted;
  }, [displayedListings, filters.category, highlightedListingIds, listings]);

  const mapEvents = useMemo(() => {
    if (filters.category === "accommodation" || filters.category === "workspace" || filters.category === "restaurant" || filters.category === "safari") return [];
    if (filters.category === "nightlife") return nearbyEventsForNightlife;
    return filteredEvents;
  }, [filteredEvents, filters.category, nearbyEventsForNightlife]);

  const mapNightlife = useMemo(() => {
    if (filters.category === "accommodation" || filters.category === "workspace" || filters.category === "restaurant" || filters.category === "safari" || filters.category === "events") return [];
    return filteredNightlife;
  }, [filteredNightlife, filters.category]);

  useEffect(() => {
    const demoModeEnabled = showRestaurantProspectsOnMap();
    Promise.all([
      api.listings(),
      api.events(),
      api.nightlife(),
      demoModeEnabled ? api.restaurantProspectsPublic() : Promise.resolve(null),
    ])
      .then(([listingData, eventData, nightlifeData, restaurantProspects]) => {
        const publicListings = listingData.filter((item) => getListingType(item) !== "estate_living_zone");
        const demoRestaurantListings = restaurantProspects
          ? restaurantProspects.restaurants.map(toDemoRestaurantListing)
          : [];

        setListings([...publicListings, ...demoRestaurantListings]);
        setEvents(eventData);
        setNightlife(nightlifeData);
        setRestaurantCounts(restaurantProspects?.counts ?? null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Listings failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const listingToNearbyTarget = useCallback((listing: Listing): SelectedNearbyTarget => ({
    id: listing.id,
    name: listing.name,
    latitude: listing.latitude,
    longitude: listing.longitude,
    province: listing.province,
    city: listing.city,
    suburb: listing.suburb,
    sourceType: getListingType(listing) === "restaurant" ? "restaurant" : "listing",
  }), []);

  const eventToNearbyTarget = useCallback((event: EventRecord): SelectedNearbyTarget => ({
    id: event.id,
    name: event.name,
    latitude: event.latitude,
    longitude: event.longitude,
    province: event.province,
    city: event.city,
    suburb: event.suburb,
    sourceType: "event",
  }), []);

  const nightlifeToNearbyTarget = useCallback((venue: NightlifeVenue): SelectedNearbyTarget => ({
    id: venue.id,
    name: venue.name,
    latitude: venue.latitude,
    longitude: venue.longitude,
    province: venue.province,
    city: venue.city,
    suburb: venue.suburb,
    sourceType: "nightlife",
  }), []);

  const selectListing = useCallback((listing: Listing) => {
    setSelected(listing);
    setSelectedEvent(undefined);
    setSelectedNightlife(undefined);
    setSelectedNearbyTarget(listingToNearbyTarget(listing));
    setServiceMarker(null);
  }, [listingToNearbyTarget]);

  const selectEvent = useCallback((event: EventRecord) => {
    setSelected(undefined);
    setSelectedNightlife(undefined);
    setServiceMarker(null);
    setSelectedEvent(event);
    setSelectedNearbyTarget(eventToNearbyTarget(event));
    setFlyTo({ lat: event.latitude, lng: event.longitude, zoom: 13 });
    setMapCenter([event.latitude, event.longitude]);
  }, [eventToNearbyTarget]);

  const selectNightlife = useCallback((venue: NightlifeVenue) => {
    setSelected(undefined);
    setSelectedEvent(undefined);
    setServiceMarker(null);
    setSelectedNightlife(venue);
    setSelectedNearbyTarget(nightlifeToNearbyTarget(venue));
    setFlyTo({ lat: venue.latitude, lng: venue.longitude, zoom: 13 });
    setMapCenter([venue.latitude, venue.longitude]);
  }, [nightlifeToNearbyTarget]);

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
            <a className="nav-link nav-link-active" href={appHref("/")} title="Map discovery">
              <MapPinned className="h-4 w-4" />Map
            </a>
            <a className="nav-link" href={appHref("/admin")} title="Admin listings">
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
            <a className="nav-link nav-link-active" href={appHref("/")} title="Map discovery">
              <MapPinned className="h-4 w-4" />Map
            </a>
            <a className="nav-link" href={appHref("/admin")} title="Admin listings">
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
            nightlife={mapNightlife}
            selectedId={selected?.id}
            selectedEventId={selectedEvent?.id}
            selectedNightlifeId={selectedNightlife?.id}
            onSelect={selectListing}
            onSelectEvent={selectEvent}
            onSelectNightlife={selectNightlife}
            highlightedListingIds={highlightedListingIds}
            highlightedEventIds={highlightedEventIds}
            serviceMarker={serviceMarker}
            region={filters.region}
            flyTo={flyTo}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-4 p-4 pt-16 md:flex-row md:items-start">
          <FilterPanel
            filters={filters}
            suburbs={suburbs}
            resultCount={displayedListings.length + mapEvents.length + mapNightlife.length}
            favouriteCount={favouriteCount}
            restaurantCounts={restaurantCounts}
            onChange={setFilters}
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
          />
        </div>
        <MapLegend />
        <ListingDetailDrawer
          listing={selected}
          allListings={listings}
          onClose={() => { setSelected(undefined); setSelectedNearbyTarget(undefined); setServiceMarker(null); }}
          onSelect={selectListing}
          onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
          onOpenPlanner={() => setPlannerOpen(true)}
          isFavourite={selected ? isFavourite(selected.id) : false}
          onToggleFavourite={toggleFavourite}
        />
        <BottomPanel
          selectedTarget={selectedNearbyTarget}
          onShowOnMap={(lat, lon, label) => setServiceMarker({ lat, lon, label })}
        />
        <EventDetailSheet
          event={selectedEvent}
          allListings={listings}
          onClose={() => { setSelectedEvent(undefined); setSelectedNearbyTarget(undefined); }}
        />
        <NightlifeDetailSheet
          venue={selectedNightlife}
          allListings={listings}
          allEvents={events}
          onClose={() => { setSelectedNightlife(undefined); setSelectedNearbyTarget(undefined); }}
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
