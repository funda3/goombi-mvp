import type { Listing } from "../types/listing";

export function getListingPhoto(listing: Listing, index = 0): string {
  return `https://picsum.photos/seed/${listing.id}-${index}/800/500`;
}
