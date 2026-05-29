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
          <span aria-label="Bold event marker" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-rose-600 text-[12px] font-black text-white shadow-sm">&#9733;</span>Bold Star = Event
        </li>
        <li className="flex items-center gap-2">
          <span aria-label="Bold nightlife moon marker" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-indigo-600 text-[13px] font-black text-white shadow-sm">&#9790;</span>Solid Moon = Nightlife
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] text-white">F</span>Fork/Food pin = Restaurant
        </li>
        <li className="flex items-center gap-2">
          <span aria-label="Safari & Wildlife lion marker" className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-500 text-[11px] shadow-sm">&#129409;</span>Lion = Safari & Wildlife
        </li>
      </ul>
    </aside>
  );
}
