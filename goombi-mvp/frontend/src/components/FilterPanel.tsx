import { Heart, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import { useIsMobile } from "../hooks/useIsMobile";
import { EVENT_CATEGORY_LABELS } from "../types/event";
import { type Filters } from "../types/listing";
import { NIGHTLIFE_MUSIC_LABELS, NIGHTLIFE_TIER_LABELS, NIGHTLIFE_VENUE_TYPE_LABELS } from "../types/nightlife";
import type { RestaurantProspectPublicCounts } from "../types/restaurantProspect";

type Props = {
  filters: Filters;
  suburbs: string[];
  resultCount: number;
  favouriteCount?: number;
  restaurantCounts?: RestaurantProspectPublicCounts | null;
  onChange: (filters: Filters) => void;
  isOpen?: boolean;
  onClose?: () => void;
};

const REGION_LABELS: Record<string, string> = {
  all: "South Africa",
  Gauteng: "Gauteng",
  "Western Cape": "Western Cape",
  "KwaZulu-Natal": "KwaZulu-Natal",
  "Limpopo & Mpumalanga": "Limpopo & Mpumalanga",
  "Eastern & Northern Cape": "Eastern & Northern Cape",
};

type PublicLayer = Exclude<Filters["category"], "all">;

const LAYER_CONFIG: { type: PublicLayer; label: string; color: string }[] = [
  { type: "accommodation",      label: "Stays",       color: "#0f766e" },
  { type: "workspace",          label: "Workspace",   color: "#a21caf" },
  { type: "events",             label: "Events",      color: "#db2777" },
  { type: "nightlife",          label: "Nightlife",   color: "#4f46e5" },
  { type: "restaurant",         label: "Restaurants", color: "#ea580c" },
  { type: "safari",             label: "Safari & Wildlife", color: "#f59e0b" },
];

function toggleLayer(filters: Filters, type: PublicLayer): Filters {
  return { ...filters, category: filters.category === type ? "all" : type };
}

export function FilterPanel({ filters, suburbs, resultCount, favouriteCount = 0, restaurantCounts = null, onChange, isOpen = false, onClose }: Props) {
  const isMobile = useIsMobile();

  if (isMobile && !isOpen) return null;

  const panelContent = (
    <>
      {isMobile && (
        <div className="flex shrink-0 items-center justify-between pb-2">
          <h2 className="text-base font-semibold text-slate-950">Filters</h2>
          <button
            aria-label="Close filters"
            className="secondary-button h-9 w-9 p-0"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {!isMobile && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700">Goombi</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">{REGION_LABELS[filters.region] ?? "South Africa"}</h1>
            <p className="mt-1 text-sm text-slate-600">{resultCount} results</p>
          </div>
          <SlidersHorizontal className="mt-1 h-5 w-5 text-slate-500" />
        </div>
      )}
      {isMobile && (
        <p className="text-sm text-slate-500">{resultCount} results</p>
      )}
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
          filters.favouritesOnly
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
        onClick={() => onChange({ ...filters, favouritesOnly: !filters.favouritesOnly })}
      >
        <Heart className={`h-4 w-4 shrink-0 transition-colors ${filters.favouritesOnly ? "fill-rose-500 text-rose-500" : ""}`} />
        <span className="flex-1 text-left">Saved listings</span>
        {favouriteCount > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
            filters.favouritesOnly ? "bg-rose-200 text-rose-800" : "bg-slate-100 text-slate-600"
          }`}>
            {favouriteCount}
          </span>
        )}
      </button>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Layers</p>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_CONFIG.map(({ type, label, color }) => {
            const hidden = filters.category !== "all" && filters.category !== type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={!hidden}
                className="rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all"
                style={
                  hidden
                    ? { borderColor: color, color, backgroundColor: "transparent" }
                    : { borderColor: color, backgroundColor: color, color: "#fff" }
                }
                onClick={() => onChange(toggleLayer(filters, type))}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {restaurantCounts && (
        <div className="rounded-md border border-orange-100 bg-orange-50/70 p-3 text-xs text-slate-700">
          <p className="font-bold uppercase tracking-wide text-orange-800">Restaurants (Demo Mode)</p>
          <p className="mt-1">Visible demo prospects: {restaurantCounts.visible_restaurant_demo_prospects}</p>
          <p>Source records: {restaurantCounts.source_records_total}</p>
        </div>
      )}
      <label className="label">
        Region
        <select
          className="field"
          value={filters.region}
          onChange={(event) => onChange({ ...filters, region: event.target.value as Filters["region"], suburb: "all" })}
        >
          <option value="all">All regions</option>
          <option value="Gauteng">Gauteng</option>
          <option value="Western Cape">Western Cape</option>
          <option value="KwaZulu-Natal">KwaZulu-Natal</option>
          <option value="Limpopo & Mpumalanga">Limpopo & Mpumalanga</option>
          <option value="Eastern & Northern Cape">Eastern & Northern Cape</option>
        </select>
      </label>
      <label className="label">
        Category
        <select
          className="field"
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value as Filters["category"] })}
        >
          <option value="all">All</option>
          <option value="accommodation">Accommodation</option>
          <option value="workspace">Workspace</option>
          <option value="events">Events</option>
          <option value="nightlife">Nightlife</option>
          <option value="restaurant">Restaurants</option>
          <option value="safari">Safari & Wildlife</option>
        </select>
      </label>
      <label className="label">
        Event type
        <select
          className="field"
          value={filters.eventCategory}
          onChange={(event) => onChange({ ...filters, eventCategory: event.target.value as Filters["eventCategory"] })}
        >
          <option value="all">All event types</option>
          {Object.entries(EVENT_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Nightlife tier
        <select
          className="field"
          value={filters.nightlifeTier}
          onChange={(event) => onChange({ ...filters, nightlifeTier: event.target.value as Filters["nightlifeTier"] })}
        >
          <option value="all">All nightlife tiers</option>
          {Object.entries(NIGHTLIFE_TIER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Music focus
        <select
          className="field"
          value={filters.nightlifeMusicFocus}
          onChange={(event) => onChange({ ...filters, nightlifeMusicFocus: event.target.value as Filters["nightlifeMusicFocus"] })}
        >
          <option value="all">All music styles</option>
          {Object.entries(NIGHTLIFE_MUSIC_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Venue type
        <select
          className="field"
          value={filters.nightlifeVenueType}
          onChange={(event) => onChange({ ...filters, nightlifeVenueType: event.target.value as Filters["nightlifeVenueType"] })}
        >
          <option value="all">All venue types</option>
          {Object.entries(NIGHTLIFE_VENUE_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Workspace type
        <select
          className="field"
          value={filters.workspaceType}
          onChange={(event) => onChange({ ...filters, workspaceType: event.target.value as Filters["workspaceType"] })}
        >
          <option value="all">All workspace types</option>
          <option value="coworking">Coworking</option>
          <option value="meeting_room">Meeting room</option>
          <option value="boardroom">Boardroom</option>
          <option value="serviced_office">Serviced office</option>
          <option value="virtual_office">Virtual office</option>
        </select>
      </label>
      <label className="label">
        Suburb
        <select
          className="field"
          value={filters.suburb}
          onChange={(event) => onChange({ ...filters, suburb: event.target.value })}
        >
          <option value="all">All suburbs</option>
          {suburbs.map((suburb) => <option key={suburb}>{suburb}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Min price
          <input
            className="field"
            min={0}
            type="number"
            value={filters.minPrice}
            onChange={(event) => onChange({ ...filters, minPrice: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="label">
          Max price
          <input
            className="field"
            min={0}
            type="number"
            value={filters.maxPrice}
            onChange={(event) => onChange({ ...filters, maxPrice: Number(event.target.value) || 0 })}
          />
        </label>
      </div>
      <label className="label">
        Minimum guest capacity
        <input
          className="field"
          min={1}
          type="number"
          value={filters.minGuests}
          onChange={(event) => onChange({ ...filters, minGuests: Number(event.target.value) || 1 })}
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" />Verified only</span>
        <input
          checked={filters.verifiedOnly}
          className="h-4 w-4 accent-emerald-700"
          type="checkbox"
          onChange={(event) => onChange({ ...filters, verifiedOnly: event.target.checked })}
        />
      </label>
      <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        Demo data only. Coordinates and owners are synthetic manual seeds for the MVP.
      </p>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={onClose}
        />
        <aside className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex flex-col gap-5 overflow-y-auto rounded-t-2xl bg-white/95 p-5 shadow-panel h-[80vh]">
          {panelContent}
        </aside>
      </>
    );
  }

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-7rem)] w-full flex-col gap-5 overflow-auto rounded-lg border border-white/70 bg-white/95 p-5 shadow-panel backdrop-blur md:w-80">
      {panelContent}
    </aside>
  );
}
