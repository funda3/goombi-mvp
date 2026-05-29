import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Heart, Mail, MapPin, MessageCircle, Phone, Users, X } from "lucide-react";

import { displayCategory, getListingType, isWorkspace, type Listing } from "../types/listing";
import { BookingEnquiryModal } from "./BookingEnquiryModal";
import { EnquiryFlow } from "./EnquiryFlow";
import { NearbyListings } from "./NearbyListings";
import { NearbyServices } from "./NearbyServices";
import { PhotoCarousel } from "./PhotoCarousel";
import { appHref } from "../utils/routes";

const LAYER_LABELS: Record<string, string> = {
  tourism_experience: "Tourism Experience",
  restaurant: "Restaurant / Eatery",
  safari: "Safari & Wildlife",
  transport_node: "Transport Node",
  event_space: "Event Space",
  estate_living_zone: "Estate Living",
};

const SAFARI_TYPE_LABELS: Record<string, string> = {
  national_park: "National Park",
  private_reserve: "Private Reserve",
  game_reserve: "Game Reserve",
  nature_reserve: "Nature Reserve",
  world_heritage_site: "World Heritage Site",
  cultural_reserve: "Cultural Reserve",
  game_farm: "Game Farm",
};

function safariPriceLabel(listing: Listing) {
  const price = listing.price_amount ?? listing.price_per_night;
  if (!price) return "Price on request";
  if (listing.safari_type === "private_reserve" || listing.safari_type === "game_farm") {
    return `From R${price}/person/night`;
  }
  return `Day entry R${price}`;
}

const PARTNER_STATUS_LABELS: Record<string, string> = {
  seed: "Seed listing",
  identified: "Identified",
  contacted: "Contacted",
  interested: "Interested",
  loi_requested: "LOI requested",
  loi_signed: "LOI signed",
  active: "Active partner",
  declined: "Declined",
};

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

  useEffect(() => {
    setEnquiryOpen(false);
  }, [listing?.id]);

  const actionButtons = (
    <div className="flex justify-end gap-2">
      {onToggleFavourite && listing && (() => {
        const isEstate = getListingType(listing) === "estate_living_zone";
        return (
          <button
            aria-label={isFavourite
              ? (isEstate ? "Remove estate from saved" : "Remove from favourites")
              : (isEstate ? "Save Estate" : "Save to favourites")}
            className="secondary-button h-9 w-9 p-0"
            type="button"
            onClick={() => onToggleFavourite(listing.id)}
          >
            <Heart className={`h-4 w-4 transition-colors ${isFavourite ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        );
      })()}
      <button aria-label="Close detail" className="secondary-button h-9 w-9 p-0" data-testid="listing-detail-close" type="button" onClick={onClose}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const isEstateZone = !!listing && getListingType(listing) === "estate_living_zone";
  const layerType = listing ? getListingType(listing) : null;
  const isDemoProspectRestaurant = !!listing && layerType === "restaurant" && listing.demo_visibility === true;

  const body = listing ? (
    <>
      <div className="mt-3">
        <PhotoCarousel key={listing.id} listing={listing} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase ${layerType === "safari" ? "text-amber-700" : "text-emerald-700"}`}>{displayCategory(listing)}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{listing.name}</h2>
        </div>
        {listing.verified_status && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">
            <BadgeCheck className="h-4 w-4" />Verified
          </span>
        )}
      </div>

      {/* Layer type & partner status badges */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(() => {
          const lt = getListingType(listing);
          if (lt !== "accommodation" && lt !== "workspace" && LAYER_LABELS[lt]) {
            return (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lt === "safari" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>
                {LAYER_LABELS[lt]}
              </span>
            );
          }
        })()}
        {layerType === "safari" && listing.safari_type && (
          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
            {SAFARI_TYPE_LABELS[listing.safari_type] ?? listing.safari_type.replace(/_/g, " ")}
          </span>
        )}
        {listing.partner_status && listing.partner_status !== "seed" && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            listing.partner_status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}>
            {PARTNER_STATUS_LABELS[listing.partner_status] ?? listing.partner_status}
          </span>
        )}
        {listing.featured && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Featured</span>
        )}
      </div>

      {/* Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listing.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      )}

      {isEstateZone ? (
        <div className="mt-4 grid gap-3 text-sm text-slate-700">
          {listing.estate_type && (
            <span className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {listing.estate_type}
            </span>
          )}
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{listing.suburb}{listing.suburb && listing.city ? ", " : ""}{listing.city}{listing.city && listing.province ? ", " : ""}{listing.province}</span>
          <div className="flex flex-wrap gap-1.5">
            {listing.long_stay_relevant && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Long Stay Friendly</span>}
            {listing.relocation_relevant && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Relocation Friendly</span>}
            {listing.diaspora_relevant && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Diaspora Relevant</span>}
            {listing.luxury_relevant && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Luxury Estate</span>}
          </div>
          {listing.lifestyle_summary && (
            <div className="mt-1">
              <h3 className="font-bold text-slate-950">Explore Estate</h3>
              <p className="mt-1 leading-6">{listing.lifestyle_summary}</p>
            </div>
          )}
        </div>
      ) : isWorkspace(listing) ? (
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
          {/* Price display shared across accommodation, experiences, eats, events */}
          {listing.price_per_night > 0 && (
            <strong className="text-lg text-slate-950">R{listing.price_per_night}/night</strong>
          )}
          {listing.price_from != null && (
            <strong className="text-lg text-slate-950">
              From R{listing.price_from}{listing.price_to != null ? `-R${listing.price_to}` : ""}
              {listing.price_unit ? ` / ${listing.price_unit}` : ""}
            </strong>
          )}
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{listing.suburb}</span>

          {/* Accommodation: rooms and guest count */}
          {layerType === "accommodation" && listing.max_guests != null && listing.max_guests > 0 && listing.rooms != null && listing.rooms > 0 && (
            <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Up to {listing.max_guests} guests in {listing.rooms} rooms</span>
          )}

          {/* Tourism experience: capacity, provider type as category */}
          {layerType === "tourism_experience" && (
            <>
              {listing.provider_type && <span><strong className="text-slate-950">Experience type:</strong> {listing.provider_type}</span>}
              {listing.capacity && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Up to {listing.capacity} guests</span>}
              {listing.township_tourism_relevant && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 w-fit">Township tourism</span>}
              {listing.diaspora_relevant && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 w-fit">Diaspora relevant</span>}
            </>
          )}

          {/* Restaurant / Eatery: cuisine type from provider_type */}
          {layerType === "restaurant" && (
            <>
              {listing.cuisine_tags && listing.cuisine_tags.length > 0 && (
                <span><strong className="text-slate-950">Cuisine:</strong> {listing.cuisine_tags.join(", ")}</span>
              )}
              {listing.provider_type && <span><strong className="text-slate-950">Type:</strong> {listing.provider_type}</span>}
              {listing.price_band_goombi && <span><strong className="text-slate-950">Price band:</strong> {listing.price_band_goombi}</span>}
              {listing.approval_status && (
                <span><strong className="text-slate-950">Approval status:</strong> {listing.approval_status.replace(/_/g, " ")}</span>
              )}
              <span className="w-fit rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-950">
                {isDemoProspectRestaurant
                  ? "Demo prospect - provider approval pending"
                  : (listing.verified_status ? "Partner verified" : "Demo/public-source record")}
              </span>
              {isDemoProspectRestaurant && (
                <a
                  className="secondary-button w-fit"
                  href={appHref("/admin/crm")}
                >
                  Manage in CRM
                </a>
              )}
            </>
          )}

          {layerType === "safari" && (
            <>
              <strong className="text-lg text-slate-950">{safariPriceLabel(listing)}</strong>
              {listing.safari_type && (
                <span><strong className="text-slate-950">Safari type:</strong> {SAFARI_TYPE_LABELS[listing.safari_type] ?? listing.safari_type.replace(/_/g, " ")}</span>
              )}
              <span className="w-fit rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-950">
                SAFARI & WILDLIFE
              </span>
            </>
          )}

          {/* Transport node: node type from provider_type, full address */}
          {layerType === "transport_node" && (
            <>
              {listing.provider_type && <span><strong className="text-slate-950">Node type:</strong> {listing.provider_type}</span>}
              <span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{listing.address}</span>
            </>
          )}

          {/* Event space: venue type from provider_type, capacity */}
          {layerType === "event_space" && (
            <>
              {listing.provider_type && <span><strong className="text-slate-950">Venue type:</strong> {listing.provider_type}</span>}
              {listing.capacity && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Capacity {listing.capacity}</span>}
            </>
          )}
        </div>
      )}

      {/* Short description (shown when available, otherwise fall back to description) */}
      <p className="mt-4 text-sm leading-6 text-slate-700">
        {layerType === "restaurant"
          ? (listing.description_goombi || listing.short_description || listing.description)
          : (listing.short_description || listing.description)}
      </p>
      {listing.long_description && (
        <p className="mt-2 text-sm leading-6 text-slate-500">{listing.long_description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {listing.amenities.map((amenity) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700" key={amenity}>{amenity}</span>
        ))}
      </div>

      {/* Contact / external links for estate listings uses discovery-only wording; no booking CTA */}
      {!isDemoProspectRestaurant && layerType !== "safari" && (listing.website_url || (!isEstateZone && listing.booking_url) || listing.whatsapp_url || listing.contact_phone || listing.contact_email) && (
        <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4">
          {listing.website_url && (
            <a className="secondary-button flex items-center justify-center gap-2" href={listing.website_url} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />{isEstateZone ? "Open Website" : "Website"}
            </a>
          )}
          {!isEstateZone && listing.booking_url && (
            <a className="primary-button flex items-center justify-center gap-2" href={listing.booking_url} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />Book / Enquire online
            </a>
          )}
          {listing.whatsapp_url && (
            <a className="secondary-button flex items-center justify-center gap-2" href={listing.whatsapp_url} rel="noreferrer" target="_blank">
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
          {listing.contact_phone && (
            <a className="secondary-button flex items-center justify-center gap-2" href={`tel:${listing.contact_phone}`}>
              <Phone className="h-4 w-4" />{listing.contact_phone}
            </a>
          )}
          {listing.contact_email && (
            <a className="secondary-button flex items-center justify-center gap-2" href={`mailto:${listing.contact_email}`}>
              <Mail className="h-4 w-4" />{listing.contact_email}
            </a>
          )}
        </div>
      )}

      {isEstateZone ? (
        <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4">
          {listing.source_note && (
            <p className="text-xs text-slate-500"><strong className="text-slate-700">Source note:</strong> {listing.source_note}</p>
          )}
          <p className="text-xs italic text-slate-500">
            Goombi is a discovery platform only. For estate enquiries, visit the estate's official website.
          </p>
        </div>
      ) : isWorkspace(listing) ? (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          <span className="w-fit rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-950">
            {listing.verified_status ? "Partner verified" : "Demo/public-source record"}
          </span>
          {!listing.booking_url && (
            <button
              type="button"
              className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              onClick={() => setEnquiryOpen(true)}
            >
              Send Enquiry
            </button>
          )}
          <p><strong className="text-slate-950">Source note:</strong> {listing.source_note}</p>
        </div>
      ) : layerType === "safari" ? (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          {listing.booking_url ? (
            <a className="primary-button flex items-center justify-center gap-2" href={listing.booking_url} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />Check availability
            </a>
          ) : (
            <button
              type="button"
              className="primary-button w-full"
              onClick={() => setEnquiryOpen(true)}
            >
              Check availability
            </button>
          )}
          {listing.source_note && (
            <p className="text-xs text-slate-500"><strong className="text-slate-700">Source note:</strong> {listing.source_note}</p>
          )}
        </div>
      ) : isDemoProspectRestaurant ? (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          <p className="text-xs text-slate-500">This marker is shown for internal demo visibility only.</p>
        </div>
      ) : (
        <EnquiryFlow listing={listing} />
      )}
      {onOpenPlanner && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <button type="button" className="primary-button w-full" onClick={onOpenPlanner}>
            Plan my journey
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
    </>
  ) : null;

  return (
    <aside
      aria-label="Listing detail"
      data-placement="right-drawer"
      data-testid="listing-detail-drawer"
      className={`fixed bottom-0 z-40 flex h-[78vh] max-h-[82vh] transform-gpu flex-col rounded-t-2xl border border-white/70 bg-white/95 shadow-[0_-10px_32px_rgba(15,23,42,0.24)] backdrop-blur transition-transform duration-300 ease-out inset-x-2 sm:inset-x-4 md:bottom-52 md:left-auto md:right-20 md:top-24 md:h-auto md:max-h-none md:w-[min(28rem,calc(100vw-7rem))] md:rounded-xl md:shadow-[0_18px_44px_rgba(15,23,42,0.22)] ${listing ? "translate-y-0 pointer-events-auto md:translate-x-0" : "translate-y-[110%] pointer-events-none md:translate-y-0 md:translate-x-[120%]"}`}
    >
      <div className="flex shrink-0 justify-center pt-3 pb-1">
        <div className="h-1 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="shrink-0 px-4 pb-1">{actionButtons}</div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">{body}</div>
    </aside>
  );
}
