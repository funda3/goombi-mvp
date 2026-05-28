import type { ServiceGroup } from "../types/services";

type Props = {
  group: ServiceGroup;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
  demoMode?: boolean;
};

function fmtDist(km: number, approximate = false): string {
  const distance = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  return approximate ? `Approx. ${distance}` : distance;
}

export function ServiceCard({ group, onShowOnMap, demoMode = false }: Props) {
  const { nearest, emoji, label } = group;
  if (!nearest) return null;
  const isFallback = demoMode || Boolean(nearest.isFallback);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <span className="shrink-0 text-lg leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">{nearest.name}</p>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-700">{fmtDist(nearest.distanceKm, isFallback)}</p>
        {isFallback && (
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              {nearest.badgeLabel || "Fallback estimate"}
            </span>
            <span className="text-[11px] text-amber-700">
              {nearest.reason || "External nearby service provider unavailable"}
            </span>
          </div>
        )}
      </div>
      {onShowOnMap && (
        <button
          type="button"
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          onClick={() => onShowOnMap(nearest.lat, nearest.lon, `${emoji} ${nearest.name}`)}
        >
          Map
        </button>
      )}
    </div>
  );
}
