from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ListingBase(BaseModel):
    name: str = Field(min_length=2)
    category: Literal["bnb", "guesthouse", "accommodation", "workspace"]
    accommodation_type: Literal["bnb", "guesthouse"] | None = None
    provider_name: str | None = None
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
    max_guests: int = Field(default=1, ge=1)
    rooms: int = Field(default=1, ge=1)
    description: str
    amenities: list[str] = Field(default_factory=list)
    photos: list[str] = Field(default_factory=list)
    owner_name: str = ""
    owner_phone: str = ""
    pricing_status: Literal["public_price", "not_publicly_available"] | None = None
    price_amount: float | None = Field(default=None, ge=0)
    price_unit: str | None = None
    capacity: int | None = Field(default=None, ge=1)
    booking_url: str | None = None
    source_url: str | None = None
    source_note: str | None = None
    verified_status: bool = False
    source_type: Literal["manual_seed"] = "manual_seed"

    @model_validator(mode="after")
    def validate_workspace_source(self):
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
    cellphone: str = Field(min_length=7)
    message: str = Field(min_length=4)
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
