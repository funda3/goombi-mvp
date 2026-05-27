export type EventCategory =
  | "music"
  | "arts"
  | "food"
  | "market"
  | "sport"
  | "cultural"
  | "business"
  | "tourism"
  | "lifestyle"
  | "nature";

export type EventRecurringType = "annual" | "monthly" | "weekly" | "seasonal" | "unknown";

export type EventNearbyFocus = "accommodation" | "workspace" | "restaurant" | "mixed";

export type EventCoordinateAccuracy = "venue" | "approximate";

export type EventRecord = {
  id: string;
  name: string;
  category: EventCategory;
  province: "Gauteng" | "Western Cape" | "KwaZulu-Natal";
  city: string;
  suburb: string;
  venue: string;
  latitude: number;
  longitude: number;
  coordinate_accuracy: EventCoordinateAccuracy;
  start_month: string;
  end_month: string;
  recurring_type: EventRecurringType;
  description: string;
  website_url: string | null;
  nearby_focus: EventNearbyFocus;
  source_type: "events_guide_manual_seed";
  source_document: string;
  verified_status: string;
};

export type EventFilters = {
  category: "all" | EventCategory;
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  music: "Music",
  arts: "Arts",
  food: "Food",
  market: "Market",
  sport: "Sport",
  cultural: "Cultural",
  business: "Business",
  tourism: "Tourism",
  lifestyle: "Lifestyle",
  nature: "Nature",
};
