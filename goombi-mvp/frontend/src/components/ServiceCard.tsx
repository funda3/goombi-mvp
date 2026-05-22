import type { ServiceGroup } from "../types/services";

type Props = {
  group: ServiceGroup;
  onShowOnMap?: (lat: number, lon: number, label: string) => void;
};

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function ServiceCard({ group, onShowOnMap }: Props) {
  const { nearest, emoji, label } = group;
  if (!nearest) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <span className="shrink-0 text-lg leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">{nearest.name}</p>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-700">{fmtDist(nearest.distanceKm)}</p>
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
