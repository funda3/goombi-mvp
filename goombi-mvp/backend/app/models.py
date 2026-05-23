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
    "transport_node",
    "estate_living_zone",
    "event_space",
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
    category: Literal["bnb", "guesthouse", "accommodation", "workspace"]
    # Spatial layer — defaults from category if omitted (migration-safe)
    listing_type: ListingTypeLiteral | None = None
    accommodation_type: Literal["bnb", "guesthouse"] | None = None
    provider_name: str | None = None
    provider_type: str | None = None
    workspace_type: Literal[
        "coworking", "meeting_room", "boardroom", "serviced_office", "virtual_office"
    ] | None = None
    province: str = "Gauteng"
    city: str = "Johannesburg"
    suburb: str
    address: str
    latitude: float
    longitude: float
    price_per_night: int = Field(default=0, ge=0)
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
    verified_status: bool = False
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
    source_type: Literal["manual_seed"] = "manual_seed"

    @model_validator(mode="after")
    def _validate_and_set_defaults(self):
        # Default listing_type from category when not explicitly provided
        if self.listing_type is None:
            self.listing_type = "workspace" if self.category == "workspace" else "accommodation"

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
