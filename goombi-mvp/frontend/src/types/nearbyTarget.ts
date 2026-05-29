export type NearbySourceType = "listing" | "restaurant" | "event" | "nightlife";

export type SelectedNearbyTarget = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  suburb?: string;
  sourceType: NearbySourceType;
};
