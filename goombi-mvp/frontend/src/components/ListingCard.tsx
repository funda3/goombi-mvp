import { BadgeCheck, BedDouble, Users } from "lucide-react";

import { displayCategory, isWorkspace, type Listing } from "../types/listing";

type Props = {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
};

export function ListingCard({ listing, onSelect }: Props) {
  return (
    <button
      className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400"
      onClick={() => onSelect?.(listing)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700">{displayCategory(listing)}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{listing.name}</h3>
        </div>
        {listing.verified_status && <BadgeCheck aria-label="Verified listing" className="h-5 w-5 text-teal-600" />}
      </div>
      <p className="mt-2 text-sm text-slate-600">{isWorkspace(listing) ? listing.provider_name : listing.suburb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        {isWorkspace(listing) ? (
          <>
            <strong>{listing.workspace_type?.replace("_", " ")}</strong>
            {listing.capacity && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{listing.capacity}</span>}
          </>
        ) : (
          <>
            <strong>R{listing.price_per_night}/night</strong>
            {listing.max_guests != null && (
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{listing.max_guests}</span>
            )}
            {listing.rooms != null && (
              <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{listing.rooms}</span>
            )}
          </>
        )}
      </div>
    </button>
  );
}
