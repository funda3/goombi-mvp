import type { Filters, Listing } from "../types/listing";

export const defaultFilters: Filters = {
  category: "all",
  workspaceType: "all",
  suburb: "all",
  minPrice: 0,
  maxPrice: 2500,
  minGuests: 1,
  verifiedOnly: false,
};

export function filterListings(listings: Listing[], filters: Filters): Listing[] {
  return listings.filter((listing) => {
    const matchesSuburb = filters.suburb === "all" || listing.suburb === filters.suburb;
    const isWorkspace = listing.category === "workspace";
    const recordCategory = isWorkspace ? "workspace" : "accommodation";
    const matchesCategory = filters.category === "all" || filters.category === recordCategory;
    const matchesWorkspaceType =
      filters.workspaceType === "all" || (isWorkspace && listing.workspace_type === filters.workspaceType);
    const matchesPrice =
      isWorkspace ||
      (listing.price_per_night >= filters.minPrice && listing.price_per_night <= filters.maxPrice);
    const matchesGuests = isWorkspace || listing.max_guests >= filters.minGuests;
    const matchesVerified = !filters.verifiedOnly || listing.verified_status;
    return matchesCategory && matchesWorkspaceType && matchesSuburb && matchesPrice && matchesGuests && matchesVerified;
  });
}
