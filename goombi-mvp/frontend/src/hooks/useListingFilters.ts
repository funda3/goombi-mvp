import { useMemo, useState } from "react";

import { defaultFilters, filterListings } from "../data/filterListings";
import type { Filters, Listing } from "../types/listing";

export function useListingFilters(listings: Listing[]) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const filteredListings = useMemo(() => filterListings(listings, filters), [filters, listings]);
  const suburbs = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.suburb))).sort(),
    [listings],
  );

  return { filters, setFilters, filteredListings, suburbs };
}
