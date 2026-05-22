import { useMemo, useState } from "react";

import { defaultFilters, filterListings } from "../data/filterListings";
import type { Filters, Listing } from "../types/listing";

export function useListingFilters(listings: Listing[]) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const filteredListings = useMemo(() => filterListings(listings, filters), [filters, listings]);
  const suburbs = useMemo(
    () =>
      Array.from(
        new Set(
          (filters.region === "all" ? listings : listings.filter((l) => l.province === filters.region)).map(
            (l) => l.suburb,
          ),
        ),
      ).sort(),
    [listings, filters.region],
  );

  return { filters, setFilters, filteredListings, suburbs };
}
