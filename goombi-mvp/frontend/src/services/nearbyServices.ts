import { fetchNearbyServices } from "./overpass";
import { fetchFoursquareDining, type FoursquareVenue } from "./foursquare";
import type { ServiceGroup } from "../types/services";

export type { FoursquareVenue };

export type AllNearbyServices = {
  groups: ServiceGroup[];
  dining: FoursquareVenue[];
};

export async function fetchAllNearbyServices(lat: number, lng: number): Promise<AllNearbyServices> {
  const [groupsResult, diningResult] = await Promise.allSettled([
    fetchNearbyServices(lat, lng),
    fetchFoursquareDining(lat, lng),
  ]);

  return {
    groups: groupsResult.status === "fulfilled" ? groupsResult.value : [],
    dining: diningResult.status === "fulfilled" ? diningResult.value : [],
  };
}
