import type { Listing } from "../types/listing";

function keywords(listing: Listing): string {
  if (listing.category === "workspace") {
    switch (listing.workspace_type) {
      case "coworking":       return "coworking,modern,office";
      case "serviced_office": return "office,corporate,workspace";
      case "boardroom":       return "boardroom,meeting,professional";
      default:                return "coworking,workspace,south-africa";
    }
  }
  const s = listing.suburb.toLowerCase();
  if (/camps bay|clifton|sea point/.test(s))          return "cape-town,beach,villa";
  if (/sandton|hyde park|rosebank/.test(s))           return "johannesburg,guesthouse,luxury";
  if (/umhlanga|ballito/.test(s))                     return "durban,beach,accommodation";
  if (/drakensberg/.test(s))                          return "drakensberg,mountain,lodge";
  if (/stellenbosch|franschhoek|paarl/.test(s))       return "winelands,guesthouse,vineyard";
  if (/knysna|plett|wilderness/.test(s))              return "garden-route,lagoon,lodge";
  if (/soweto|maboneng/.test(s))                      return "johannesburg,township,boutique";
  if (/hout bay|muizenberg|simon/.test(s))            return "cape-town,coastal,cottage";
  return "south-africa,guesthouse,accommodation";
}

export function getListingPhoto(listing: Listing, index = 0): string {
  return `https://source.unsplash.com/featured/800x500?${keywords(listing)}&sig=${listing.id}${index}`;
}
