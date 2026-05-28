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
  | "ev_charging"
  | "workspace"
  | "attraction"
  | "parking";

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
  source?: "external" | "fallback";
  isFallback?: boolean;
  badgeLabel?: string;
  reason?: string | null;
};

export type ServiceGroup = {
  category: ServiceCategory;
  emoji: string;
  label: string;
  nearest: NearbyServiceItem | null;
};

export type NearbyServicesApiResponse = {
  status: "live" | "fallback" | "empty";
  message: string;
  services: ServiceGroup[];
};

export type NearbyServicesResult = {
  status: "live" | "fallback" | "empty";
  message: string;
  services: ServiceGroup[];
};
