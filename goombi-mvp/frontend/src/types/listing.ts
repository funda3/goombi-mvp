export type AccommodationType = "bnb" | "guesthouse";
export type WorkspaceType = "coworking" | "meeting_room" | "boardroom" | "serviced_office" | "virtual_office";
export type ListingCategory = AccommodationType | "accommodation" | "workspace";

export type ListingType =
  | "accommodation"
  | "workspace"
  | "tourism_experience"
  | "restaurant"
  | "transport_node"
  | "estate_living_zone"
  | "event_space";

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
  "transport_node",
  "estate_living_zone",
  "event_space",
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
  province: string;
  region?: string | null;
  city: string;
  suburb: string;
  address: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  max_guests: number | null;
  rooms: number | null;
  description: string;
  short_description?: string | null;
  long_description?: string | null;
  amenities: string[];
  photos: string[];
  images?: string[];
  tags?: string[];
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
  booking_url?: string | null;
  source_url?: string | null;
  source_note?: string | null;
  featured?: boolean;
  verified_status: boolean;
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
  source_type: "manual_seed";
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
  region: "all" | "Gauteng" | "Western Cape" | "KwaZulu-Natal";
  category: "all" | "accommodation" | "workspace";
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
  return "accommodation";
}

export function isWorkspace(listing: Listing) {
  return listing.category === "workspace";
}

/** Human-readable label for the listing's spatial layer. */
export function displayCategory(listing: Listing): string {
  const lt = getListingType(listing);
  switch (lt) {
    case "workspace": return "Workspace";
    case "tourism_experience": return "Tourism Experience";
    case "restaurant": return "Restaurant";
    case "transport_node": return "Transport";
    case "event_space": return "Event Space";
    case "estate_living_zone": return "Estate Living";
    default: return "Accommodation";
  }
}

