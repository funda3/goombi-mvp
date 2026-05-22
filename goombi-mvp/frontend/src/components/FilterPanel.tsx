import { ShieldCheck, SlidersHorizontal } from "lucide-react";

import type { Filters } from "../types/listing";

type Props = {
  filters: Filters;
  suburbs: string[];
  resultCount: number;
  onChange: (filters: Filters) => void;
};

export function FilterPanel({ filters, suburbs, resultCount, onChange }: Props) {
  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-7rem)] w-full flex-col gap-5 overflow-auto rounded-lg border border-white/70 bg-white/95 p-5 shadow-panel backdrop-blur md:w-80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">Goombi</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">Johannesburg North</h1>
          <p className="mt-1 text-sm text-slate-600">{resultCount} demo accommodation and workspace results</p>
        </div>
        <SlidersHorizontal className="mt-1 h-5 w-5 text-slate-500" />
      </div>
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
    </aside>
  );
}
