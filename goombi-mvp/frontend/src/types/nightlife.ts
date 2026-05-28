export type NightlifeTier =
  | "premium"
  | "underground"
  | "alternative"
  | "student"
  | "township"
  | "jazz_soul"
  | "multi_floor"
  | "beach_club";

export type NightlifeMusicFocus =
  | "amapiano"
  | "afro_house"
  | "deep_house"
  | "house"
  | "techno"
  | "trance"
  | "hip_hop"
  | "afrobeats"
  | "gqom"
  | "kwaito"
  | "jazz"
  | "soul"
  | "commercial"
  | "live_music";

export type NightlifeVenueType =
  | "nightclub"
  | "lounge"
  | "rooftop"
  | "beach_club"
  | "jazz_bar"
  | "entertainment_complex"
  | "restaurant_club"
  | "market_lifestyle";

export type NightlifeVenue = {
  id: string;
  name: string;
  province: "Gauteng" | "Western Cape" | "KwaZulu-Natal";
  city: string;
  suburb: string;
  address: string;
  latitude: number;
  longitude: number;
  coordinate_accuracy: "venue" | "approximate";
  nightlife_tier: NightlifeTier;
  music_focus: NightlifeMusicFocus[];
  venue_type: NightlifeVenueType;
  description: string;
  opening_pattern: string;
  website_url: string | null;
  instagram_url: string | null;
  source_type: "manual_seed";
  source_note: string;
  verified_status: "unverified_public_research";
};

export const NIGHTLIFE_TIER_LABELS: Record<NightlifeTier, string> = {
  premium: "Premium",
  underground: "Underground",
  alternative: "Alternative",
  student: "Student",
  township: "Township",
  jazz_soul: "Jazz & Soul",
  multi_floor: "Multi-floor",
  beach_club: "Beach Club",
};

export const NIGHTLIFE_MUSIC_LABELS: Record<NightlifeMusicFocus, string> = {
  amapiano: "Amapiano",
  afro_house: "Afro House",
  deep_house: "Deep House",
  house: "House",
  techno: "Techno",
  trance: "Trance",
  hip_hop: "Hip Hop",
  afrobeats: "Afrobeats",
  gqom: "Gqom",
  kwaito: "Kwaito",
  jazz: "Jazz",
  soul: "Soul",
  commercial: "Commercial",
  live_music: "Live Music",
};

export const NIGHTLIFE_VENUE_TYPE_LABELS: Record<NightlifeVenueType, string> = {
  nightclub: "Nightclub",
  lounge: "Lounge",
  rooftop: "Rooftop",
  beach_club: "Beach Club",
  jazz_bar: "Jazz Bar",
  entertainment_complex: "Entertainment Complex",
  restaurant_club: "Restaurant Club",
  market_lifestyle: "Market Lifestyle",
};
