import { useMemo, useRef, useState, useEffect } from "react";
import { Bed, Building2, Clock, MapPin, Search, X } from "lucide-react";

import type { Listing } from "../types/listing";
import {
  buildSearchIndex,
  highlightMatch,
  searchListings,
  type ListingResult,
  type SuburbResult,
} from "../utils/searchIndex";

const STORAGE_KEY = "goombi_recent_searches";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistRecent(terms: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

function pushRecent(term: string): string[] {
  const next = [term, ...loadRecent().filter((r) => r !== term)].slice(0, MAX_RECENT);
  persistRecent(next);
  return next;
}

function dropRecent(term: string): string[] {
  const next = loadRecent().filter((r) => r !== term);
  persistRecent(next);
  return next;
}

export type SearchAction =
  | { kind: "suburb"; suburb: string; lat: number; lng: number }
  | { kind: "listing"; listing: Listing };

type Props = {
  listings: Listing[];
  mapCenter: [number, number];
  onResultSelect: (action: SearchAction) => void;
};

type FlatItem =
  | { kind: "suburb"; data: SuburbResult }
  | { kind: "listing"; data: ListingResult };

export function SearchBar({ listings, mapCenter, onResultSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const index = useMemo(() => buildSearchIndex(listings), [listings]);

  const results = useMemo(
    () =>
      query.trim().length >= 2
        ? searchListings(query.trim(), index, mapCenter[0], mapCenter[1])
        : null,
    [query, index, mapCenter],
  );

  const flatItems = useMemo<FlatItem[]>(() => {
    if (!results) return [];
    return [
      ...results.suburbs.map((d): FlatItem => ({ kind: "suburb", data: d })),
      ...results.accommodation.map((d): FlatItem => ({ kind: "listing", data: d })),
      ...results.workspaces.map((d): FlatItem => ({ kind: "listing", data: d })),
    ];
  }, [results]);

  const showRecent = open && query.trim().length === 0 && recent.length > 0;
  const showDropdown = open && (showRecent || results !== null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  function openDropdown() {
    setRecent(loadRecent());
    setOpen(true);
    setActiveIdx(-1);
  }

  function handleChange(value: string) {
    setQuery(value);
    setActiveIdx(-1);
    setOpen(true);
  }

  function handleClear() {
    clearTimeout(clearTimer.current);
    setQuery("");
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { handleClear(); return; }
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? flatItems[activeIdx] : flatItems[0];
      if (target) selectItem(target);
    }
  }

  function selectItem(item: FlatItem) {
    const name = item.kind === "suburb" ? item.data.suburb : item.data.listing.name;
    const term = query.trim();
    if (term) setRecent(pushRecent(term));
    clearTimeout(clearTimer.current);
    setQuery(name);
    setOpen(false);
    setActiveIdx(-1);

    const action: SearchAction =
      item.kind === "suburb"
        ? { kind: "suburb", suburb: item.data.suburb, lat: item.data.lat, lng: item.data.lng }
        : { kind: "listing", listing: item.data.listing };
    onResultSelect(action);

    clearTimer.current = setTimeout(() => setQuery(""), 1500);
  }

  function selectRecent(term: string) {
    setQuery(term);
    setRecent(loadRecent());
  }

  function removeRecentItem(term: string) {
    setRecent(dropRecent(term));
  }

  const accentIdx = (base: number, i: number) => base + i;

  return (
    <div className="relative w-full max-w-[480px]" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          placeholder="Search suburbs, listings, or providers..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear search"
            className="absolute right-2 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600"
            onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[480px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {showRecent && (
            <div>
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-slate-400">Recent searches</p>
              {recent.map((term) => (
                <div key={term} className="flex items-center">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={(e) => { e.preventDefault(); selectRecent(term); }}
                  >
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-slate-700">{term}</span>
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove "${term}" from recent searches`}
                    className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeRecentItem(term); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {results !== null && flatItems.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
          )}

          {results !== null && results.suburbs.length > 0 && (
            <section>
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-slate-400">📍 Suburbs</p>
              {results.suburbs.map((s, i) => (
                <ResultRow
                  key={s.suburb}
                  icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                  primaryHtml={highlightMatch(s.suburb, query.trim())}
                  secondary={`${s.count} listing${s.count !== 1 ? "s" : ""} · ${s.province}`}
                  distanceKm={s.distanceKm}
                  active={activeIdx === accentIdx(0, i)}
                  onSelect={() => selectItem({ kind: "suburb", data: s })}
                />
              ))}
            </section>
          )}

          {results !== null && results.accommodation.length > 0 && (
            <section>
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-slate-400">🏠 Accommodation</p>
              {results.accommodation.map((r, i) => (
                <ResultRow
                  key={r.listing.id}
                  icon={<Bed className="h-4 w-4 text-teal-600" />}
                  primaryHtml={highlightMatch(r.listing.name, query.trim())}
                  secondary={`${r.listing.suburb} · ${r.listing.province}`}
                  distanceKm={r.distanceKm}
                  active={activeIdx === accentIdx(results.suburbs.length, i)}
                  onSelect={() => selectItem({ kind: "listing", data: r })}
                />
              ))}
            </section>
          )}

          {results !== null && results.workspaces.length > 0 && (
            <section>
              <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-slate-400">🏢 Workspaces</p>
              {results.workspaces.map((r, i) => (
                <ResultRow
                  key={r.listing.id}
                  icon={<Building2 className="h-4 w-4 text-fuchsia-600" />}
                  primaryHtml={highlightMatch(r.listing.name, query.trim())}
                  secondary={`${r.listing.provider_name ?? r.listing.suburb} · ${r.listing.suburb}`}
                  distanceKm={r.distanceKm}
                  active={activeIdx === accentIdx(results.suburbs.length + results.accommodation.length, i)}
                  onSelect={() => selectItem({ kind: "listing", data: r })}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  icon,
  primaryHtml,
  secondary,
  distanceKm,
  active,
  onSelect,
}: {
  icon: React.ReactNode;
  primaryHtml: string;
  secondary: string;
  distanceKm: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
        active ? "bg-emerald-50" : "hover:bg-slate-50"
      }`}
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate font-medium text-slate-900 [&_mark]:bg-emerald-100 [&_mark]:font-bold [&_mark]:text-emerald-800"
          dangerouslySetInnerHTML={{ __html: primaryHtml }}
        />
        <span className="block truncate text-xs text-slate-500">{secondary}</span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-slate-400">{distanceKm.toFixed(1)} km</span>
    </button>
  );
}
