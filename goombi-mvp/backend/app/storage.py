import json
from pathlib import Path
from threading import Lock
from typing import Any

from .models import Enquiry, EnquiryCreate, Listing, ListingCreate, ListingUpdate, utc_now


DATA_DIR = Path(__file__).parent / "data"
LISTINGS_FILE = DATA_DIR / "listings.json"
ENQUIRIES_FILE = DATA_DIR / "enquiries.json"
_LOCK = Lock()


class JsonStore:
    def __init__(self, listings_path: Path = LISTINGS_FILE, enquiries_path: Path = ENQUIRIES_FILE):
        self.listings_path = listings_path
        self.enquiries_path = enquiries_path
        self._ensure_file(self.listings_path)
        self._ensure_file(self.enquiries_path)

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
