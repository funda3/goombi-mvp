export type ServiceCategory =
  | "gym"
  | "shopping"
  | "fuel"
  | "hospital"
  | "clinic"
  | "police"
  | "restaurant"
  | "atm"
  | "supermarket"
  | "pharmacy"
  | "transit"
  | "ev_charging";

export type ServiceMarker = {
  lat: number;
  lon: number;
  label: string;
};

export type NearbyServiceItem = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

export type ServiceGroup = {
  category: ServiceCategory;
  emoji: string;
  label: string;
  nearest: NearbyServiceItem | null;
};

export type NearbyServicesApiResponse = {
  status: "ok" | "fallback";
  services: ServiceGroup[];
};
