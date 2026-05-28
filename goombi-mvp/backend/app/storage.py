import json
from pathlib import Path
from threading import Lock
from typing import Any

from .models import (
    Enquiry,
    EnquiryCreate,
    Event,
    Listing,
    ListingCreate,
    ListingUpdate,
    NightlifeVenue,
    ProviderCrm,
    ProviderCrmCreate,
    ProviderCrmUpdate,
    RestaurantProspect,
    RestaurantProspectCreate,
    RestaurantProspectUpdate,
    utc_now,
)


DATA_DIR = Path(__file__).parent / "data"
LISTINGS_FILE = DATA_DIR / "listings.json"
ENQUIRIES_FILE = DATA_DIR / "enquiries.json"
EVENTS_FILE = DATA_DIR / "events.json"
NIGHTLIFE_FILE = DATA_DIR / "nightlife.json"
RESTAURANT_PROSPECTS_FILE = DATA_DIR / "restaurant_prospects.json"
PROVIDER_CRM_FILE = DATA_DIR / "provider_crm.json"
_LOCK = Lock()


class JsonStore:
    def __init__(
        self,
        listings_path: Path = LISTINGS_FILE,
        enquiries_path: Path = ENQUIRIES_FILE,
        events_path: Path = EVENTS_FILE,
        nightlife_path: Path = NIGHTLIFE_FILE,
        restaurant_prospects_path: Path = RESTAURANT_PROSPECTS_FILE,
        provider_crm_path: Path = PROVIDER_CRM_FILE,
    ):
        self.listings_path = listings_path
        self.enquiries_path = enquiries_path
        self.events_path = events_path
        self.nightlife_path = nightlife_path
        self.restaurant_prospects_path = restaurant_prospects_path
        self.provider_crm_path = provider_crm_path
        self._ensure_file(self.listings_path)
        self._ensure_file(self.enquiries_path)
        self._ensure_file(self.events_path)
        self._ensure_file(self.nightlife_path)
        self._ensure_file(self.restaurant_prospects_path)
        self._ensure_file(self.provider_crm_path)

    @staticmethod
    def _ensure_file(path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_text("[]\n", encoding="utf-8")

    @staticmethod
    def _read(path: Path) -> list[dict[str, Any]]:
        with _LOCK:
            return json.loads(path.read_text(encoding="utf-8") or "[]")

    @staticmethod
    def _write(path: Path, records: list[dict[str, Any]]) -> None:
        with _LOCK:
            path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")

    def list_listings(self) -> list[Listing]:
        return [Listing.model_validate(item) for item in self._read(self.listings_path)]

    def get_listing(self, listing_id: str) -> Listing | None:
        return next((item for item in self.list_listings() if item.id == listing_id), None)

    def create_listing(self, payload: ListingCreate) -> Listing:
        listing = Listing.from_create(payload)
        records = self._read(self.listings_path)
        records.append(listing.model_dump())
        self._write(self.listings_path, records)
        return listing

    def update_listing(self, listing_id: str, payload: ListingUpdate) -> Listing | None:
        records = self._read(self.listings_path)
        for index, item in enumerate(records):
            if item["id"] == listing_id:
                updated = Listing(
                    id=listing_id,
                    created_at=item["created_at"],
                    updated_at=utc_now(),
                    **payload.model_dump(),
                )
                records[index] = updated.model_dump()
                self._write(self.listings_path, records)
                return updated
        return None

    def delete_listing(self, listing_id: str) -> bool:
        records = self._read(self.listings_path)
        remaining = [item for item in records if item["id"] != listing_id]
        if len(remaining) == len(records):
            return False
        self._write(self.listings_path, remaining)
        return True

    def list_enquiries(self) -> list[Enquiry]:
        return [Enquiry.model_validate(item) for item in self._read(self.enquiries_path)]

    def create_enquiry(self, payload: EnquiryCreate) -> Enquiry:
        enquiry = Enquiry.from_create(payload)
        records = self._read(self.enquiries_path)
        records.append(enquiry.model_dump())
        self._write(self.enquiries_path, records)
        return enquiry

    def list_events(self) -> list[Event]:
        return [Event.model_validate(item) for item in self._read(self.events_path)]

    def get_event(self, event_id: str) -> Event | None:
        return next((item for item in self.list_events() if item.id == event_id), None)

    def list_nightlife(self) -> list[NightlifeVenue]:
        return [NightlifeVenue.model_validate(item) for item in self._read(self.nightlife_path)]

    def get_nightlife(self, venue_id: str) -> NightlifeVenue | None:
        return next((item for item in self.list_nightlife() if item.id == venue_id), None)

    def list_restaurant_prospects(self) -> list[RestaurantProspect]:
        return [RestaurantProspect.model_validate(item) for item in self._read(self.restaurant_prospects_path)]

    def get_restaurant_prospect(self, prospect_id: str) -> RestaurantProspect | None:
        return next((item for item in self.list_restaurant_prospects() if item.id == prospect_id), None)

    def create_restaurant_prospect(self, payload: RestaurantProspectCreate) -> RestaurantProspect:
        prospect = RestaurantProspect.from_create(payload)
        records = self._read(self.restaurant_prospects_path)
        records.append(prospect.model_dump())
        self._write(self.restaurant_prospects_path, records)
        return prospect

    def update_restaurant_prospect(
        self, prospect_id: str, payload: RestaurantProspectUpdate
    ) -> RestaurantProspect | None:
        records = self._read(self.restaurant_prospects_path)
        for index, item in enumerate(records):
            if item["id"] == prospect_id:
                updated = RestaurantProspect(
                    id=prospect_id,
                    created_at=item["created_at"],
                    updated_at=utc_now(),
                    **payload.model_dump(),
                )
                records[index] = updated.model_dump()
                self._write(self.restaurant_prospects_path, records)
                return updated
        return None

    def delete_restaurant_prospect(self, prospect_id: str) -> bool:
        records = self._read(self.restaurant_prospects_path)
        remaining = [item for item in records if item["id"] != prospect_id]
        if len(remaining) == len(records):
            return False
        self._write(self.restaurant_prospects_path, remaining)
        return True

    def list_provider_crm(self) -> list[ProviderCrm]:
        return [ProviderCrm.model_validate(item) for item in self._read(self.provider_crm_path)]

    def get_provider_crm(self, crm_id: str) -> ProviderCrm | None:
        return next((item for item in self.list_provider_crm() if item.id == crm_id), None)

    def create_provider_crm(self, payload: ProviderCrmCreate) -> ProviderCrm:
        record = ProviderCrm.from_create(payload)
        records = self._read(self.provider_crm_path)
        records.append(record.model_dump())
        self._write(self.provider_crm_path, records)
        return record

    def update_provider_crm(self, crm_id: str, payload: ProviderCrmUpdate) -> ProviderCrm | None:
        records = self._read(self.provider_crm_path)
        for index, item in enumerate(records):
            if item["id"] == crm_id:
                updated = ProviderCrm(
                    id=crm_id,
                    created_at=item["created_at"],
                    updated_at=utc_now(),
                    **payload.model_dump(),
                )
                records[index] = updated.model_dump()
                self._write(self.provider_crm_path, records)
                return updated
        return None

    def patch_provider_crm(self, crm_id: str, changes: dict[str, Any]) -> ProviderCrm | None:
        records = self._read(self.provider_crm_path)
        for index, item in enumerate(records):
            if item["id"] == crm_id:
                merged = {**item, **changes, "updated_at": utc_now()}
                updated = ProviderCrm.model_validate(merged)
                records[index] = updated.model_dump()
                self._write(self.provider_crm_path, records)
                return updated
        return None

    def delete_provider_crm(self, crm_id: str) -> bool:
        records = self._read(self.provider_crm_path)
        remaining = [item for item in records if item["id"] != crm_id]
        if len(remaining) == len(records):
            return False
        self._write(self.provider_crm_path, remaining)
        return True
