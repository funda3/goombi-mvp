export function MapLegend() {
  return (
    <aside className="pointer-events-auto absolute bottom-4 right-4 z-30 rounded-lg border border-white/70 bg-white/95 px-3 py-2 shadow-panel backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Map Legend</p>
      <ul className="mt-2 grid gap-1.5 text-xs text-slate-700">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-teal-700" />Circle = Accommodation
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rotate-45 rounded-[2px] bg-fuchsia-700" />Square = Workspace
        </li>
        <li className="flex items-center gap-2">
          <span className="goombi-event-star-marker inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] text-rose-600">★</span>Star/Pulse = Event
        </li>
      </ul>
    </aside>
  );
}
