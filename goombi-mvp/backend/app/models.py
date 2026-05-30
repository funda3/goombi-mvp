from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


ListingTypeLiteral = Literal[
    "accommodation",
    "workspace",
    "tourism_experience",
    "restaurant",
    "safari",
    "transport_node",
    "estate_living_zone",
    "event_space",
    "township",
]

TownshipTypeLiteral = Literal[
    "guesthouse",
    "bnb",
    "cultural_lodge",
    "cultural_centre",
    "attraction",
    "restaurant",
    "market",
]

EventCategoryLiteral = Literal[
    "music",
    "arts",
    "food",
    "market",
    "sport",
    "cultural",
    "business",
    "tourism",
    "lifestyle",
    "nature",
]

EventRecurringTypeLiteral = Literal["annual", "monthly", "weekly", "seasonal", "unknown"]

EventNearbyFocusLiteral = Literal["accommodation", "workspace", "restaurant", "mixed"]

EventCoordinateAccuracyLiteral = Literal["venue", "approximate"]

NightlifeCoordinateAccuracyLiteral = Literal["venue", "approximate"]

NightlifeTierLiteral = Literal[
    "premium",
    "underground",
    "alternative",
    "student",
    "township",
    "jazz_soul",
    "multi_floor",
    "beach_club",
]

NightlifeMusicFocusLiteral = Literal[
    "amapiano",
    "afro_house",
    "deep_house",
    "house",
    "techno",
    "trance",
    "hip_hop",
    "afrobeats",
    "gqom",
    "kwaito",
    "jazz",
    "soul",
    "commercial",
    "live_music",
]

NightlifeVenueTypeLiteral = Literal[
    "nightclub",
    "lounge",
    "rooftop",
    "beach_club",
    "jazz_bar",
    "entertainment_complex",
    "restaurant_club",
    "market_lifestyle",
]

PartnerStatusLiteral = Literal[
    "seed",
    "identified",
    "contacted",
    "interested",
    "loi_requested",
    "loi_signed",
    "active",
    "declined",
]


class ListingBase(BaseModel):
    name: str = Field(min_length=2)
    category: Literal["bnb", "guesthouse", "accommodation", "workspace", "restaurant", "safari", "township"]
    # Spatial layer — defaults from category if omitted (migration-safe)
    listing_type: ListingTypeLiteral | None = None
    township_type: TownshipTypeLiteral | None = None
    accommodation_type: Literal["bnb", "guesthouse"] | None = None
    provider_name: str | None = None
    provider_type: str | None = None
    cuisine_tags: list[str] = Field(default_factory=list)
    price_band_goombi: str | None = None
    description_goombi: str | None = None
    workspace_type: Literal[
        "coworking", "meeting_room", "boardroom", "serviced_office", "virtual_office"
    ] | None = None
    safari_type: Literal[
        "national_park",
        "private_reserve",
        "game_reserve",
        "nature_reserve",
        "world_heritage_site",
        "cultural_reserve",
        "game_farm",
    ] | None = None
    province: str = "Gauteng"
    region: str | None = None
    city: str = "Johannesburg"
    suburb: str
    address: str
    latitude: float
    longitude: float
    price_per_night: int | None = Field(default=0, ge=0)
    guest_capacity: int | None = Field(default=None, ge=1)
    bathrooms: int | None = Field(default=None, ge=1)
    # rooms and max_guests are meaningful only for accommodation/workspace records;
    # non-stay listing types (restaurant, transport_node, etc.) may have null.
    max_guests: int | None = None
    rooms: int | None = None
    description: str
    short_description: str | None = None
    long_description: str | None = None
    amenities: list[str] = Field(default_factory=list)
    photos: list[str] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    nearby_attractions: list[str] = Field(default_factory=list)
    owner_name: str = ""
    owner_phone: str = ""
    contact_email: str | None = None
    contact_phone: str | None = None
    website_url: str | None = None
    whatsapp_url: str | None = None
    pricing_status: Literal["public_price", "not_publicly_available"] | None = None
    price_amount: float | None = Field(default=None, ge=0)
    price_unit: str | None = None
    price_from: float | None = Field(default=None, ge=0)
    price_to: float | None = Field(default=None, ge=0)
    capacity: int | None = Field(default=None, ge=1)
    booking_url: str | None = None
    source_url: str | None = None
    source_note: str | None = None
    featured: bool = False
    verified_status: bool | Literal["demo_verified"] = False
    partner_status: PartnerStatusLiteral = "seed"
    diaspora_relevant: bool = False
    luxury_relevant: bool = False
    business_travel_relevant: bool = False
    relocation_relevant: bool = False
    township_tourism_relevant: bool = False
    # Estate Living fields (discovery only — no transactional fields)
    estate_type: str | None = None
    lifestyle_summary: str | None = None
    long_stay_relevant: bool = False
    source_type: Literal["manual_seed", "provider_approved", "manual_public_source"] = "manual_seed"

    @model_validator(mode="after")
    def _validate_and_set_defaults(self):
        # Default listing_type from category when not explicitly provided
        if self.listing_type is None:
            if self.category == "workspace":
                self.listing_type = "workspace"
            elif self.category == "restaurant":
                self.listing_type = "restaurant"
            elif self.category == "safari":
                self.listing_type = "safari"
            elif self.category == "township":
                self.listing_type = "township"
            else:
                self.listing_type = "accommodation"

        # Normalise province ↔ region: keep them in sync; reject records missing both
        if self.province and not self.region:
            self.region = self.province
        elif self.region and not self.province:
            self.province = self.region
        elif not self.province and not self.region:
            raise ValueError("At least one of 'province' or 'region' must be provided")

        if self.listing_type == "township":
            if self.township_type is None:
                raise ValueError("Township records require 'township_type'")

            township_stay_types = {"guesthouse", "bnb", "cultural_lodge"}
            is_township_stay = self.township_type in township_stay_types

            if is_township_stay:
                if self.price_per_night is None or self.price_per_night < 1:
                    raise ValueError("Township stay records require a positive 'price_per_night'")

                if self.guest_capacity is None:
                    self.guest_capacity = self.max_guests
                if self.bathrooms is None:
                    self.bathrooms = self.rooms

                if self.guest_capacity is None or self.guest_capacity < 1:
                    raise ValueError("Township stay records require positive 'guest_capacity'")
                if self.bathrooms is None or self.bathrooms < 1:
                    raise ValueError("Township stay records require positive 'bathrooms'")

                self.max_guests = self.guest_capacity
                self.rooms = self.bathrooms
            else:
                self.price_per_night = None
                self.guest_capacity = None
                self.bathrooms = None
                self.max_guests = None
                self.rooms = None

            if self.category != "township":
                self.category = "township"

            return self

        if self.price_per_night is None:
            self.price_per_night = 0

        _stay_types = {"accommodation", "workspace"}

        if self.listing_type in _stay_types:
            # Accommodation / workspace: ensure positive values (normalise legacy 0s)
            if self.rooms is None or self.rooms < 1:
                self.rooms = 1
            if self.max_guests is None or self.max_guests < 1:
                self.max_guests = 1
        else:
            # Non-stay layers: coerce 0 → null; null is fine
            if self.rooms is not None and self.rooms < 1:
                self.rooms = None
            if self.max_guests is not None and self.max_guests < 1:
                self.max_guests = None

        # Workspace records require specific provenance fields (preserved from original)
        if self.category == "workspace":
            required = {
                "provider_name": self.provider_name,
                "workspace_type": self.workspace_type,
                "pricing_status": self.pricing_status,
                "source_url": self.source_url,
                "source_note": self.source_note,
            }
            missing = [field for field, value in required.items() if not value]
            if missing:
                raise ValueError(f"Workspace records require: {', '.join(missing)}")

        return self


class ListingCreate(ListingBase):
    pass


class ListingUpdate(ListingBase):
    pass


class Listing(ListingBase):
    id: str
    created_at: str
    updated_at: str

    @classmethod
    def from_create(cls, payload: ListingCreate) -> "Listing":
        timestamp = utc_now()
        return cls(
            id=str(uuid4()),
            created_at=timestamp,
            updated_at=timestamp,
            **payload.model_dump(),
        )


class EnquiryCreate(BaseModel):
    listing_id: str
    name: str = Field(min_length=2)
    cellphone: str | None = None
    email: str | None = None
    phone: str | None = None
    listing_name: str | None = None
    message: str | None = None
    check_in: str | None = None
    check_out: str | None = None
    guests: int | None = Field(default=None, ge=1)
    start_date: str | None = None
    otp_verified: bool = False


class Enquiry(EnquiryCreate):
    id: str
    created_at: str

    @classmethod
    def from_create(cls, payload: EnquiryCreate) -> "Enquiry":
        return cls(id=str(uuid4()), created_at=utc_now(), **payload.model_dump())


class OtpRequest(BaseModel):
    cellphone: str = Field(min_length=7)


class OtpVerify(BaseModel):
    cellphone: str = Field(min_length=7)
    code: str = Field(min_length=4, max_length=8)


class OtpResponse(BaseModel):
    status: Literal["placeholder"]
    message: str
    otp_verified: bool | None = None


class Event(BaseModel):
    id: str
    name: str = Field(min_length=2)
    category: EventCategoryLiteral
    province: Literal["Gauteng", "Western Cape", "KwaZulu-Natal"]
    city: str = Field(min_length=2)
    suburb: str
    venue: str
    latitude: float
    longitude: float
    coordinate_accuracy: EventCoordinateAccuracyLiteral
    start_month: str
    end_month: str
    recurring_type: EventRecurringTypeLiteral
    description: str
    website_url: str | None = None
    nearby_focus: EventNearbyFocusLiteral
    source_type: Literal["events_guide_manual_seed"] = "events_guide_manual_seed"
    source_document: str
    verified_status: str


class NightlifeVenue(BaseModel):
    id: str
    name: str = Field(min_length=2)
    province: Literal["Gauteng", "Western Cape", "KwaZulu-Natal"]
    city: str = Field(min_length=2)
    suburb: str
    address: str
    latitude: float
    longitude: float
    coordinate_accuracy: NightlifeCoordinateAccuracyLiteral
    nightlife_tier: NightlifeTierLiteral
    music_focus: list[NightlifeMusicFocusLiteral] = Field(default_factory=list)
    venue_type: NightlifeVenueTypeLiteral
    description: str
    opening_pattern: str
    website_url: str | None = None
    instagram_url: str | None = None
    source_type: Literal["manual_seed"] = "manual_seed"
    source_note: str
    verified_status: Literal["unverified_public_research"] = "unverified_public_research"


RestaurantApprovalStatusLiteral = Literal[
    "prospect_only",
    "contacted",
    "loi_requested",
    "loi_signed",
    "provider_approved",
    "rejected",
]

ProviderTypeLiteral = Literal["accommodation", "workspace", "nightlife", "restaurant", "event"]

ProviderCrmStatusLiteral = Literal[
    "prospect_only",
    "contacted",
    "loi_requested",
    "loi_sent",
    "negotiation",
    "loi_signed",
    "provider_approved",
    "rejected",
    "inactive",
    "public_marker_live",
]

OutreachChannelLiteral = Literal[
    "email",
    "phone",
    "whatsapp",
    "instagram",
    "linkedin",
    "in_person",
    "referral",
    "website_form",
]

ProviderPriorityLiteral = Literal["low", "medium", "high", "strategic"]


class RestaurantProspectBase(BaseModel):
    name: str = Field(min_length=2)
    province: str
    city: str
    suburb: str
    cuisine_tags: list[str] = Field(default_factory=list)
    price_band: str | None = None
    source_document: str
    source_type: Literal["restaurant_audit_seed"] = "restaurant_audit_seed"
    audit_status: Literal["prospect_only"] = "prospect_only"
    approval_status: RestaurantApprovalStatusLiteral = "prospect_only"
    public_website_url: str | None = None
    public_contact_url: str | None = None
    notes_internal: str
    latitude: float
    longitude: float
    coordinate_accuracy: str


class RestaurantProspectCreate(RestaurantProspectBase):
    pass


class RestaurantProspectUpdate(RestaurantProspectBase):
    pass


class RestaurantProspect(RestaurantProspectBase):
    id: str
    created_at: str
    updated_at: str

    @classmethod
    def from_create(cls, payload: RestaurantProspectCreate) -> "RestaurantProspect":
        timestamp = utc_now()
        return cls(id=str(uuid4()), created_at=timestamp, updated_at=timestamp, **payload.model_dump())


class RestaurantProspectPublicMarker(BaseModel):
    id: str
    name: str
    category: Literal["restaurant"] = "restaurant"
    listing_type: Literal["restaurant"] = "restaurant"
    region: str
    province: str
    city: str
    suburb: str
    cuisine_tags: list[str] = Field(default_factory=list)
    price_band: str | None = None
    price_band_goombi: str | None = None
    description_goombi: str
    latitude: float
    longitude: float
    source_type: Literal["demo_public_restaurant"] = "demo_public_restaurant"
    verified_status: bool = False
    partner_status: Literal["seed"] = "seed"


class RestaurantProspectPublicCounts(BaseModel):
    visible_restaurant_demo_prospects: int
    source_records_total: int


class RestaurantProspectPublicResponse(BaseModel):
    restaurants: list[RestaurantProspectPublicMarker]
    counts: RestaurantProspectPublicCounts


ServiceCategoryLiteral = Literal[
    "gym",
    "shopping",
    "fuel",
    "hospital",
    "clinic",
    "police",
    "restaurant",
    "atm",
    "supermarket",
    "pharmacy",
    "transit",
    "ev_charging",
    "workspace",
    "attraction",
    "parking",
]


class NearbyServiceItem(BaseModel):
    id: int
    name: str
    lat: float
    lon: float
    distanceKm: float
    source: Literal["external", "fallback"] = "external"
    isFallback: bool = False
    badgeLabel: str = "Live result"
    reason: str | None = None


class NearbyServiceGroup(BaseModel):
    category: ServiceCategoryLiteral
    emoji: str
    label: str
    nearest: NearbyServiceItem | None = None


class NearbyServicesResponse(BaseModel):
    status: Literal["live", "fallback", "empty"]
    message: str
    services: list[NearbyServiceGroup]


class ProviderCrmBase(BaseModel):
    provider_type: ProviderTypeLiteral
    provider_record_id: str
    provider_name: str = Field(min_length=2)
    province: str
    city: str
    current_status: ProviderCrmStatusLiteral = "prospect_only"
    assigned_to: str | None = None
    priority: ProviderPriorityLiteral = "medium"
    outreach_channel: OutreachChannelLiteral | None = None
    outreach_note: str | None = None
    next_followup_date: str | None = None
    loi_sent_at: str | None = None
    loi_signed_at: str | None = None
    provider_approved_at: str | None = None
    public_listing_created_at: str | None = None


class ProviderCrmCreate(ProviderCrmBase):
    pass


class ProviderCrmUpdate(ProviderCrmBase):
    pass


class ProviderCrm(ProviderCrmBase):
    id: str
    created_at: str
    updated_at: str

    @classmethod
    def from_create(cls, payload: ProviderCrmCreate) -> "ProviderCrm":
        timestamp = utc_now()
        return cls(id=str(uuid4()), created_at=timestamp, updated_at=timestamp, **payload.model_dump())
