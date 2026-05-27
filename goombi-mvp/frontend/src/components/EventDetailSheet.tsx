import { useMemo } from "react";
import { CalendarDays, MapPin, Repeat, Star, X } from "lucide-react";

import type { EventRecord } from "../types/event";
import { EVENT_CATEGORY_LABELS } from "../types/event";
import { getListingType, type Listing } from "../types/listing";
import { haversineKm } from "../utils/haversine";

type Props = {
  event?: EventRecord;
  allListings: Listing[];
  onClose: () => void;
};

type NearbyItem = {
  listing: Listing;
  distanceKm: number;
};

function seasonLabel(event: EventRecord): string {
  if (event.start_month === event.end_month) return event.start_month;
  return `${event.start_month} to ${event.end_month}`;
}

export function EventDetailSheet({ event, allListings, onClose }: Props) {
  const nearby = useMemo<NearbyItem[]>(() => {
    if (!event) return [];
    return allListings
      .filter((listing) => {
        const listingType = getListingType(listing);
        if (listingType !== "accommodation" && listingType !== "workspace") return false;
        const distanceKm = haversineKm(event.latitude, event.longitude, listing.latitude, listing.longitude);
        return distanceKm <= 5;
      })
      .map((listing) => ({
        listing,
        distanceKm: haversineKm(event.latitude, event.longitude, listing.latitude, listing.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [allListings, event]);

  return (
    <aside
      aria-label="Event detail"
      data-testid="event-bottom-sheet"
      className={`fixed bottom-0 z-40 flex h-[62vh] min-h-[55vh] max-h-[70vh] transform-gpu flex-col rounded-t-2xl border border-white/70 bg-white/95 shadow-[0_-10px_32px_rgba(15,23,42,0.24)] backdrop-blur transition-transform duration-300 ease-out md:h-[50vh] md:min-h-[40vh] md:max-h-[60vh] ${event ? "translate-y-0 pointer-events-auto" : "translate-y-[110%] pointer-events-none"} inset-x-2 sm:inset-x-4 md:inset-x-auto md:left-1/2 md:w-[min(92vw,560px)] md:-translate-x-1/2`}
    >
      <div className="flex shrink-0 justify-center pt-3 pb-1">
        <div className="h-1 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="shrink-0 px-4 pb-1">
        <div className="flex justify-end">
          <button aria-label="Close event detail" className="secondary-button h-9 w-9 p-0" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {event && (
          <>
            <div className="mt-1 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-rose-700">Event</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{event.name}</h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                <Star className="h-4 w-4" />Goombi Events Guide
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {event.province}, {event.city}, {event.suburb}
              </span>
              <span><strong className="text-slate-950">Venue:</strong> {event.venue}</span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <strong className="text-slate-950">Season:</strong> {seasonLabel(event)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <strong className="text-slate-950">Recurring:</strong> {event.recurring_type}
              </span>
              <span><strong className="text-slate-950">Category:</strong> {EVENT_CATEGORY_LABELS[event.category]}</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">{event.description}</p>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Nearby Accommodation and Workspace</h3>
              {nearby.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No nearby accommodation or workspace found within 5 km.</p>
              ) : (
                <ul className="mt-2 grid gap-2">
                  {nearby.map(({ listing, distanceKm }) => (
                    <li key={listing.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{listing.name}</p>
                      <p className="text-xs text-slate-500">
                        {getListingType(listing) === "workspace" ? "Workspace" : "Accommodation"} · {distanceKm.toFixed(1)} km
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
