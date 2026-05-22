export type AccommodationType = "bnb" | "guesthouse";
export type WorkspaceType = "coworking" | "meeting_room" | "boardroom" | "serviced_office" | "virtual_office";
export type ListingCategory = AccommodationType | "accommodation" | "workspace";

export type Listing = {
  id: string;
  name: string;
  category: ListingCategory;
  accommodation_type?: AccommodationType | null;
  provider_name?: string | null;
  workspace_type?: WorkspaceType | null;
  province: string;
  city: string;
  suburb: string;
  address: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  max_guests: number;
  rooms: number;
  description: string;
  amenities: string[];
  photos: string[];
  owner_name: string;
  owner_phone: string;
  pricing_status?: "public_price" | "not_publicly_available" | null;
  price_amount?: number | null;
  price_unit?: string | null;
  capacity?: number | null;
  booking_url?: string | null;
  source_url?: string | null;
  source_note?: string | null;
  verified_status: boolean;
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

export type Filters = {
  category: "all" | "accommodation" | "workspace";
  workspaceType: "all" | WorkspaceType;
  suburb: string;
  minPrice: number;
  maxPrice: number;
  minGuests: number;
  verifiedOnly: boolean;
};

export function isWorkspace(listing: Listing) {
  return listing.category === "workspace";
}

export function displayCategory(listing: Listing) {
  return isWorkspace(listing) ? "workspace" : "accommodation";
}
