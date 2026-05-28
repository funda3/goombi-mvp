import type { NightlifeVenue } from "../types/nightlife";

type Props = {
  venues: NightlifeVenue[];
  selectedProvince: "all" | "Gauteng" | "Western Cape" | "KwaZulu-Natal";
  selectedVenueId?: string;
  onSelectVenue: (venue: NightlifeVenue) => void;
};

export function NightlifeNearbyPanel({ venues, selectedProvince, selectedVenueId, onSelectVenue }: Props) {
  const scopedVenues = venues
    .filter((venue) => selectedProvince === "all" || venue.province === selectedProvince)
    .slice(0, 12);

  if (scopedVenues.length === 0) return null;

  return (
    <aside className="pointer-events-auto absolute left-4 top-28 z-30 w-[min(92vw,320px)] rounded-lg border border-white/70 bg-white/95 p-3 shadow-panel backdrop-blur md:left-[22rem] md:top-4">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Nightlife near me</p>
      <p className="mt-1 text-xs text-slate-500">
        {selectedProvince === "all" ? "South Africa" : selectedProvince}
      </p>
      <ul className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto">
        {scopedVenues.map((venue) => (
          <li key={venue.id}>
            <button
              type="button"
              className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition ${selectedVenueId === venue.id ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"}`}
              onClick={() => onSelectVenue(venue)}
            >
              <p className="font-semibold">{venue.name}</p>
              <p className="text-[11px] opacity-80">{venue.city} · {venue.nightlife_tier.replace("_", " ")}</p>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
