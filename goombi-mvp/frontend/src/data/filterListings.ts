import { getListingType, type Filters, type Listing } from "../types/listing";

export const defaultFilters: Filters = {
  region: "all",
  category: "all",
  eventCategory: "all",
  nightlifeMusicFocus: "all",
  nightlifeVenueType: "all",
  nightlifeTier: "all",
  workspaceType: "all",
  suburb: "all",
  minPrice: 0,
  maxPrice: 2500,
  minGuests: 1,
  verifiedOnly: false,
  favouritesOnly: false,
  hiddenLayers: [],
};

export function filterListings(listings: Listing[], filters: Filters): Listing[] {
  return listings.filter((listing) => {
    const matchesRegion = filters.region === "all" || listing.region === filters.region || listing.province === filters.region;
    const matchesSuburb = filters.suburb === "all" || listing.suburb === filters.suburb;
    const effectiveType = getListingType(listing);
    const isEstate = effectiveType === "estate_living_zone";
    const isWorkspace = effectiveType === "workspace";
    const isPublicRestaurant =
      effectiveType !== "restaurant" ||
      (
        listing.category === "restaurant" &&
        (
          listing.source_type === "demo_public_restaurant" ||
          listing.demo_visibility === true ||
          listing.source_type === "provider_approved" ||
          listing.source_type === "manual_public_source"
        )
      );
    const recordCategory =
      effectiveType === "restaurant" ? "restaurant" :
      effectiveType === "safari" ? "safari" :
      effectiveType === "workspace" ? "workspace" :
      "accommodation";
    const matchesCategory =
      filters.category === "all" ||
      (filters.category !== "events" && filters.category !== "nightlife" && filters.category === recordCategory);
    const matchesWorkspaceType =
      filters.workspaceType === "all" || (isWorkspace && listing.workspace_type === filters.workspaceType);
    const matchesPrice =
      effectiveType !== "accommodation" ||
      (listing.price_per_night >= filters.minPrice && listing.price_per_night <= filters.maxPrice);
    const isStay = effectiveType === "accommodation";
    const matchesGuests = !isStay || (listing.max_guests != null && listing.max_guests >= filters.minGuests);
    const matchesVerified = !filters.verifiedOnly || listing.verified_status;
    const matchesLayer =
      filters.hiddenLayers.length === 0 || !filters.hiddenLayers.includes(effectiveType);
    return (
      matchesRegion &&
      !isEstate &&
      isPublicRestaurant &&
      matchesCategory &&
      matchesWorkspaceType &&
      matchesSuburb &&
      matchesPrice &&
      matchesGuests &&
      matchesVerified &&
      matchesLayer
    );
  });
}

