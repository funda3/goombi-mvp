export type RestaurantApprovalStatus =
  | "prospect_only"
  | "contacted"
  | "loi_requested"
  | "loi_signed"
  | "provider_approved"
  | "rejected";

export type RestaurantProspect = {
  id: string;
  name: string;
  province: string;
  city: string;
  suburb: string;
  cuisine_tags: string[];
  price_band: string;
  source_document: string;
  source_type: "restaurant_audit_seed";
  audit_status: "prospect_only";
  approval_status: RestaurantApprovalStatus;
  public_website_url?: string | null;
  public_contact_url?: string | null;
  notes_internal: string;
  latitude: number;
  longitude: number;
  coordinate_accuracy: string;
  created_at: string;
  updated_at: string;
};

export type RestaurantProspectDraft = Omit<RestaurantProspect, "id" | "created_at" | "updated_at">;

export type RestaurantProspectPublicMarker = {
  id: string;
  name: string;
  category: "restaurant";
  listing_type: "restaurant";
  region: string;
  province: string;
  city: string;
  suburb: string;
  cuisine_tags: string[];
  price_band?: string | null;
  price_band_goombi?: string | null;
  description_goombi: string;
  latitude: number;
  longitude: number;
  source_type: "demo_public_restaurant";
  verified_status: false;
  partner_status: "seed";
  approval_status?: RestaurantApprovalStatus;
  demo_visibility?: boolean;
};

export type RestaurantProspectPublicApiMarker = {
  id: string;
  name: string;
  category?: "restaurant";
  listing_type?: "restaurant";
  region?: string;
  province: string;
  city: string;
  suburb: string;
  cuisine_tags?: string[];
  price_band?: string | null;
  price_band_goombi?: string | null;
  description_goombi?: string;
  latitude: number;
  longitude: number;
  source_type?: "demo_public_restaurant";
  verified_status?: false;
  partner_status?: "seed";
  approval_status?: RestaurantApprovalStatus;
  demo_visibility?: boolean;
};

export type RestaurantProspectPublicCounts = {
  visible_restaurant_demo_prospects: number;
  source_records_total: number;
  approved_restaurants?: number;
  pending_approval?: number;
};

export type RestaurantProspectPublicResponse = {
  restaurants: RestaurantProspectPublicApiMarker[];
  counts: RestaurantProspectPublicCounts;
};
