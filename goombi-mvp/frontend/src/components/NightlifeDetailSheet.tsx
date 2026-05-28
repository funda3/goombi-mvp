import { useMemo } from "react";
import { MapPin, Music2, Sparkles, X } from "lucide-react";

import type { EventRecord } from "../types/event";
import { getListingType, type Listing } from "../types/listing";
import {
  NIGHTLIFE_MUSIC_LABELS,
  NIGHTLIFE_TIER_LABELS,
  NIGHTLIFE_VENUE_TYPE_LABELS,
  type NightlifeVenue,
} from "../types/nightlife";
import { haversineKm } from "../utils/haversine";

type Props = {
  venue?: NightlifeVenue;
  allListings: Listing[];
  allEvents: EventRecord[];
  onClose: () => void;
};

type NearbyListing = {
  listing: Listing;
  distanceKm: number;
};

type NearbyEvent = {
  event: EventRecord;
  distanceKm: number;
};

function mapNearbyListings(venue: NightlifeVenue | undefined, listings: Listing[], type: "accommodation" | "workspace") {
  if (!venue) return [];
  return listings
    .filter((listing) => getListingType(listing) === type)
    .map((listing) => ({
      listing,
      distanceKm: haversineKm(venue.latitude, venue.longitude, listing.latitude, listing.longitude),
    }))
    .filter((item) => item.distanceKm <= 5)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);
}

function mapNearbyEvents(venue: NightlifeVenue | undefined, events: EventRecord[]) {
  if (!venue) return [];
  return events
    .map((event) => ({
      event,
      distanceKm: haversineKm(venue.latitude, venue.longitude, event.latitude, event.longitude),
    }))
    .filter((item) => item.distanceKm <= 10)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);
}

export function NightlifeDetailSheet({ venue, allListings, allEvents, onClose }: Props) {
  const nearbyAccommodation = useMemo<NearbyListing[]>(
    () => mapNearbyListings(venue, allListings, "accommodation"),
    [allListings, venue],
  );
  const nearbyWorkspaces = useMemo<NearbyListing[]>(
    () => mapNearbyListings(venue, allListings, "workspace"),
    [allListings, venue],
  );
  const nearbyEvents = useMemo<NearbyEvent[]>(() => mapNearbyEvents(venue, allEvents), [allEvents, venue]);

  return (
    <aside
      aria-label="Nightlife detail"
      data-testid="nightlife-bottom-sheet"
      className={`fixed bottom-0 z-40 flex h-[62vh] min-h-[55vh] max-h-[70vh] transform-gpu flex-col rounded-t-2xl border border-white/70 bg-white/95 shadow-[0_-10px_32px_rgba(15,23,42,0.24)] backdrop-blur transition-transform duration-300 ease-out md:h-[50vh] md:min-h-[40vh] md:max-h-[60vh] ${venue ? "translate-y-0 pointer-events-auto" : "translate-y-[110%] pointer-events-none"} inset-x-2 sm:inset-x-4 md:inset-x-auto md:left-1/2 md:w-[min(92vw,640px)] md:-translate-x-1/2`}
    >
      <div className="flex shrink-0 justify-center pb-1 pt-3">
        <div className="h-1 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="shrink-0 px-4 pb-1">
        <div className="flex justify-end">
          <button aria-label="Close nightlife detail" className="secondary-button h-9 w-9 p-0" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {venue && (
          <>
            <div className="mt-1 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-700">Nightlife</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{venue.name}</h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                <Sparkles className="h-4 w-4" />Goombi Nightlife
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {venue.province}, {venue.city}, {venue.suburb}
              </span>
              <span><strong className="text-slate-950">Tier:</strong> {NIGHTLIFE_TIER_LABELS[venue.nightlife_tier]}</span>
              <span><strong className="text-slate-950">Venue type:</strong> {NIGHTLIFE_VENUE_TYPE_LABELS[venue.venue_type]}</span>
              <span className="inline-flex items-start gap-2">
                <Music2 className="mt-0.5 h-4 w-4" />
                <span>
                  <strong className="text-slate-950">Music focus:</strong>{" "}
                  {venue.music_focus.map((item) => NIGHTLIFE_MUSIC_LABELS[item]).join(", ")}
                </span>
              </span>
              <span><strong className="text-slate-950">Opening pattern:</strong> {venue.opening_pattern}</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">{venue.description}</p>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              {venue.website_url && (
                <a className="secondary-button justify-start" href={venue.website_url} target="_blank" rel="noreferrer">
                  Venue website
                </a>
              )}
              {venue.instagram_url && (
                <a className="secondary-button justify-start" href={venue.instagram_url} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Accommodation within 5 km</h3>
                {nearbyAccommodation.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No accommodation nearby.</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {nearbyAccommodation.map(({ listing, distanceKm }) => (
                      <li key={listing.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{listing.name}</p>
                        <p className="text-xs text-slate-500">{distanceKm.toFixed(1)} km</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Workspace within 5 km</h3>
                {nearbyWorkspaces.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No workspace nearby.</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {nearbyWorkspaces.map(({ listing, distanceKm }) => (
                      <li key={listing.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{listing.name}</p>
                        <p className="text-xs text-slate-500">{distanceKm.toFixed(1)} km</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Events within 10 km</h3>
                {nearbyEvents.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No events nearby.</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {nearbyEvents.map(({ event, distanceKm }) => (
                      <li key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{event.name}</p>
                        <p className="text-xs text-slate-500">{event.city} · {distanceKm.toFixed(1)} km</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
