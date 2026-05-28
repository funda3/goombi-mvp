export type ProviderType = "accommodation" | "workspace" | "nightlife" | "restaurant" | "event";

export type ProviderCrmStatus =
  | "prospect_only"
  | "contacted"
  | "loi_requested"
  | "loi_sent"
  | "negotiation"
  | "loi_signed"
  | "provider_approved"
  | "rejected"
  | "inactive"
  | "public_marker_live";

export type OutreachChannel =
  | "email"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "linkedin"
  | "in_person"
  | "referral"
  | "website_form";

export type ProviderPriority = "low" | "medium" | "high" | "strategic";

export type ProviderCrmRecord = {
  id: string;
  provider_type: ProviderType;
  provider_record_id: string;
  provider_name: string;
  province: string;
  city: string;
  current_status: ProviderCrmStatus;
  assigned_to?: string | null;
  priority: ProviderPriority;
  outreach_channel?: OutreachChannel | null;
  outreach_note?: string | null;
  next_followup_date?: string | null;
  loi_sent_at?: string | null;
  loi_signed_at?: string | null;
  provider_approved_at?: string | null;
  public_listing_created_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderCrmDraft = Omit<ProviderCrmRecord, "id" | "created_at" | "updated_at">;
