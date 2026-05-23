import { useState } from "react";
import { BadgeCheck, Heart, MapPin, Users, X } from "lucide-react";

import { displayCategory, isWorkspace, type Listing } from "../types/listing";
import { BookingEnquiryModal } from "./BookingEnquiryModal";
import { EnquiryFlow } from "./EnquiryFlow";
import { NearbyListings } from "./NearbyListings";
import { NearbyServices } from "./NearbyServices";
import { PhotoCarousel } from "./PhotoCarousel";

type Props = {
  listing?: Listing;
  allListings?: Listing[];
  onClose: () => void;
  onSelect?: (listing: Listing) => void;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
  onOpenPlanner?: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: (id: string) => void;
};

export function ListingDetailDrawer({ listing, allListings, onClose, onSelect, onShowOnMap, onOpenPlanner, isFavourite, onToggleFavourite }: Props) {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  if (!listing) return null;

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-auto rounded-lg border border-white/70 bg-white/95 p-5 shadow-panel backdrop-blur md:w-[25rem]">
      <div className="flex justify-end gap-2">
        {onToggleFavourite && (
          <button
            aria-label={isFavourite ? "Remove from favourites" : "Save to favourites"}
            className="secondary-button h-9 w-9 p-0"
            type="button"
            onClick={() => onToggleFavourite(listing.id)}
          >
            <Heart className={`h-4 w-4 transition-colors ${isFavourite ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        )}
        <button aria-label="Close detail" className="secondary-button h-9 w-9 p-0" type="button" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3">
        <PhotoCarousel key={listing.id} listing={listing} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">{displayCategory(listing)}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{listing.name}</h2>
        </div>
        {listing.verified_status && <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800"><BadgeCheck className="h-4 w-4" />Verified</span>}
      </div>
      {isWorkspace(listing) ? (
        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          <span><strong className="text-slate-950">Provider:</strong> {listing.provider_name}</span>
          <span><strong className="text-slate-950">Type:</strong> {listing.workspace_type?.replace("_", " ")}</span>
          <span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{listing.address}</span>
          {listing.capacity && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Capacity {listing.capacity}</span>}
          <strong className="text-lg text-slate-950">
            {listing.pricing_status === "public_price" && listing.price_amount !== null && listing.price_amount !== undefined
              ? `Displayed price ${listing.price_amount}/${listing.price_unit}`
              : "Pricing not publicly available"}
          </strong>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          <strong className="text-lg text-slate-950">R{listing.price_per_night}/night</strong>
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{listing.suburb}</span>
          <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Up to {listing.max_guests} guests in {listing.rooms} rooms</span>
        </div>
      )}
      <p className="mt-4 text-sm leading-6 text-slate-700">{listing.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {listing.amenities.map((amenity) => <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700" key={amenity}>{amenity}</span>)}
      </div>
      {isWorkspace(listing) ? (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          <span className="w-fit rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-950">
            {listing.verified_status ? "Partner verified" : "Demo/public-source record"}
          </span>
          {listing.booking_url && <a className="primary-button" href={listing.booking_url} rel="noreferrer" target="_blank">Open booking page</a>}
          <button
            type="button"
            className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition"
            onClick={() => setEnquiryOpen(true)}
          >
            Send Enquiry
          </button>
          <p><strong className="text-slate-950">Source note:</strong> {listing.source_note}</p>
        </div>
      ) : (
        <EnquiryFlow listing={listing} />
      )}
      {onOpenPlanner && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <button type="button" className="primary-button w-full" onClick={onOpenPlanner}>
            🗺️ Plan my journey
          </button>
        </div>
      )}
      {allListings && allListings.length > 0 && onSelect && (
        <NearbyListings selected={listing} allListings={allListings} onSelect={onSelect} />
      )}
      <NearbyServices listing={listing} onShowOnMap={onShowOnMap} />
      {enquiryOpen && (
        <BookingEnquiryModal listing={listing} onClose={() => setEnquiryOpen(false)} />
      )}
    </aside>
  );
}
