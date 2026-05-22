import { BadgeCheck, ExternalLink, Users } from "lucide-react";

import type { Listing } from "../types/listing";

type Props = {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
};

export function WorkspaceCard({ listing, onSelect }: Props) {
  const priceText =
    listing.pricing_status === "public_price" && listing.price_amount != null
      ? `R${listing.price_amount}${listing.price_unit ? `/${listing.price_unit}` : ""}`
      : "Pricing on request";

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-fuchsia-400"
      onClick={() => onSelect?.(listing)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-fuchsia-700">Workspace</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-950">{listing.name}</h3>
          {listing.provider_name && (
            <p className="truncate text-xs text-slate-500">{listing.provider_name}</p>
          )}
        </div>
        {listing.verified_status && (
          <BadgeCheck aria-label="Verified" className="h-4 w-4 shrink-0 text-teal-600" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {listing.workspace_type && (
          <span className="rounded-md bg-fuchsia-50 px-2 py-0.5 text-xs font-semibold capitalize text-fuchsia-800">
            {listing.workspace_type.replace(/_/g, " ")}
          </span>
        )}
        {listing.capacity != null && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <Users className="h-3 w-3" />{listing.capacity} seats
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-800">{priceText}</p>

      {listing.booking_url && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <ExternalLink className="h-3 w-3" />Open booking page
        </span>
      )}
    </button>
  );
}
