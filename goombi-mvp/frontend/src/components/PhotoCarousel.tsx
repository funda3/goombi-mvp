import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Listing } from "../types/listing";
import { getListingPhoto } from "../utils/listingPhoto";

const PHOTO_COUNT = 3;

type Props = { listing: Listing };

export function PhotoCarousel({ listing }: Props) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [index]);

  const src = getListingPhoto(listing, index);

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-lg bg-slate-200">
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-emerald-800 text-5xl font-bold text-white">
          {listing.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
          <img
            key={src}
            src={src}
            alt={listing.name}
            className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      )}

      {/* Prev / next arrows */}
      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => setIndex((i) => (i - 1 + PHOTO_COUNT) % PHOTO_COUNT)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => setIndex((i) => (i + 1) % PHOTO_COUNT)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {Array.from({ length: PHOTO_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Photo ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition ${i === index ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
