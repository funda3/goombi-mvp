import type { EventCategory } from "./event";
import type { NightlifeMusicFocus, NightlifeTier, NightlifeVenueType } from "./nightlife";

export type AccommodationType = "bnb" | "guesthouse";
export type WorkspaceType = "coworking" | "meeting_room" | "boardroom" | "serviced_office" | "virtual_office" | "innovation_hub";
export type SafariType =
  | "national_park"
  | "private_reserve"
  | "game_reserve"
  | "nature_reserve"
  | "world_heritage_site"
  | "cultural_reserve"
  | "game_farm";
export type TownshipType =
  | "guesthouse"
  | "bnb"
  | "cultural_lodge"
  | "cultural_centre"
  | "attraction"
  | "restaurant"
  | "market";

export type ListingCategory = AccommodationType | "accommodation" | "workspace" | "restaurant" | "safari" | "township";

export type ListingType =
  | "accommodation"
  | "workspace"
  | "tourism_experience"
  | "restaurant"
  | "safari"
  | "transport_node"
  | "estate_living_zone"
  | "event_space"
  | "township";

export type PartnerStatus =
  | "seed"
  | "identified"
  | "contacted"
  | "interested"
  | "loi_requested"
  | "loi_signed"
  | "active"
  | "declined";

export const ALL_LISTING_TYPES: ListingType[] = [
  "accommodation",
  "workspace",
  "tourism_experience",
  "restaurant",
  "safari",
  "transport_node",
  "estate_living_zone",
  "event_space",
  "township",
];

export const ALL_PARTNER_STATUSES: PartnerStatus[] = [
  "seed", "identified", "contacted", "interested",
  "loi_requested", "loi_signed", "active", "declined",
];

export type Listing = {
  id: string;
  name: string;
  category: ListingCategory;
  listing_type?: ListingType | null;
  accommodation_type?: AccommodationType | null;
  provider_name?: string | null;
  provider_type?: string | null;
  workspace_type?: WorkspaceType | null;
  safari_type?: SafariType | null;
  township_type?: TownshipType | null;
  province: string;
  region?: string | null;
  city: string;
  suburb: string;
  address: string;
  latitude: number;
  longitude: number;
  price_per_night: number | null;
  guest_capacity?: number | null;
  bathrooms?: number | null;
  max_guests: number | null;
  rooms: number | null;
  description: string;
  short_description?: string | null;
  long_description?: string | null;
  amenities: string[];
  photos: string[];
  images?: string[];
  tags?: string[];
  nearby_attractions?: string[];
  owner_name: string;
  owner_phone: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  whatsapp_url?: string | null;
  pricing_status?: "public_price" | "not_publicly_available" | null;
  price_amount?: number | null;
  price_unit?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  capacity?: number | null;
  cuisine_tags?: string[];
  approval_status?: string;
  demo_visibility?: boolean;
  price_band_goombi?: string | null;
  description_goombi?: string | null;
  booking_url?: string | null;
  source_url?: string | null;
  source_note?: string | null;
  featured?: boolean;
  verified_status: boolean | "demo_verified";
  partner_status?: PartnerStatus;
  diaspora_relevant?: boolean;
  luxury_relevant?: boolean;
  business_travel_relevant?: boolean;
  relocation_relevant?: boolean;
  township_tourism_relevant?: boolean;
  // Estate Living fields (discovery only)
  estate_type?: string | null;
  lifestyle_summary?: string | null;
  long_stay_relevant?: boolean;
  source_type: "manual_seed" | "provider_approved" | "manual_public_source" | "demo_public_restaurant";
  created_at: string;
  updated_at: string;
};

export type ListingDraft = Omit<Listing, "id" | "created_at" | "updated_at">;

export type EnquiryDraft = {
  listing_id: string;
  name: string;
  cellphone: string;
  message: string;
  otp_verified: boolean;
};

export type BookingEnquiryDraft = {
  listing_id: string;
  listing_name: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  start_date?: string;
};

export type Enquiry = {
  id: string;
  listing_id: string;
  listing_name?: string | null;
  name: string;
  email?: string | null;
  cellphone?: string | null;
  created_at: string;
};

export type Filters = {
  region: "all" | "Gauteng" | "Western Cape" | "KwaZulu-Natal" | "Limpopo & Mpumalanga" | "Eastern & Northern Cape";
  category: "all" | "accommodation" | "workspace" | "restaurant" | "safari" | "township" | "events" | "nightlife";
  eventCategory: "all" | EventCategory;
  nightlifeMusicFocus: "all" | NightlifeMusicFocus;
  nightlifeVenueType: "all" | NightlifeVenueType;
  nightlifeTier: "all" | NightlifeTier;
  workspaceType: "all" | WorkspaceType;
  suburb: string;
  minPrice: number;
  maxPrice: number;
  minGuests: number;
  verifiedOnly: boolean;
  favouritesOnly: boolean;
  hiddenLayers: ListingType[];
};

/** Derive the spatial layer type from a listing, with fallback for legacy records. */
export function getListingType(listing: Listing): ListingType {
  if (listing.listing_type) return listing.listing_type;
  if (listing.category === "workspace") return "workspace";
  if (listing.category === "restaurant") return "restaurant";
  if (listing.category === "safari") return "safari";
  if (listing.category === "township") return "township";
  return "accommodation";
}

export function isWorkspace(listing: Listing) {
  return getListingType(listing) === "workspace";
}

/** Human-readable label for the listing's spatial layer. */
export function displayCategory(listing: Listing): string {
  const lt = getListingType(listing);
  switch (lt) {
    case "workspace": return "Workspace";
    case "tourism_experience": return "Tourism Experience";
    case "restaurant": return "Restaurant";
    case "safari": return "Safari & Wildlife";
    case "township": return "Township Tourism";
    case "transport_node": return "Transport";
    case "event_space": return "Event Space";
    case "estate_living_zone": return "Estate Living";
    default: return "Accommodation";
  }
}

