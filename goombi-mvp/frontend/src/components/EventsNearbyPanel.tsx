import type { EventRecord } from "../types/event";

type Props = {
  events: EventRecord[];
  selectedProvince: "all" | "Gauteng" | "Western Cape" | "KwaZulu-Natal";
  selectedEventId?: string;
  onSelectEvent: (event: EventRecord) => void;
};

export function EventsNearbyPanel({ events, selectedProvince, selectedEventId, onSelectEvent }: Props) {
  const scopedEvents = events
    .filter((event) => selectedProvince === "all" || event.province === selectedProvince)
    .slice(0, 12);

  if (scopedEvents.length === 0) return null;

  return (
    <aside className="pointer-events-auto absolute left-4 top-28 z-30 w-[min(92vw,320px)] rounded-lg border border-white/70 bg-white/95 p-3 shadow-panel backdrop-blur md:left-[22rem] md:top-4">
      <p className="text-xs font-bold uppercase tracking-wide text-rose-700">What&apos;s happening nearby?</p>
      <p className="mt-1 text-xs text-slate-500">
        {selectedProvince === "all" ? "South Africa" : selectedProvince}
      </p>
      <ul className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto">
        {scopedEvents.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition ${selectedEventId === event.id ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50"}`}
              onClick={() => onSelectEvent(event)}
            >
              <p className="font-semibold">{event.name}</p>
              <p className="text-[11px] opacity-80">{event.city} · {event.start_month}</p>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
