import json

from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import JsonStore


def listing_payload(name: str = "Demo Stay") -> dict:
    return {
        "name": name,
        "category": "guesthouse",
        "province": "Gauteng",
        "city": "Johannesburg",
        "suburb": "Bryanston",
        "address": "Demo address",
        "latitude": -26.053,
        "longitude": 28.024,
        "price_per_night": 980,
        "max_guests": 4,
        "rooms": 2,
        "description": "Synthetic demo listing.",
        "amenities": ["WiFi"],
        "photos": [],
        "owner_name": "Demo Owner",
        "owner_phone": "+27110000000",
        "verified_status": True,
        "source_type": "manual_seed",
    }


def client(tmp_path) -> TestClient:
    listings_path = tmp_path / "listings.json"
    enquiries_path = tmp_path / "enquiries.json"
    listings_path.write_text("[]", encoding="utf-8")
    enquiries_path.write_text("[]", encoding="utf-8")
    return TestClient(create_app(JsonStore(listings_path, enquiries_path)))


def test_healthz(tmp_path):
    response = client(tmp_path).get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_listing_crud(tmp_path):
    api = client(tmp_path)
    created = api.post("/api/listings", json=listing_payload()).json()
    assert created["name"] == "Demo Stay"
    assert api.get("/api/listings").json()[0]["id"] == created["id"]
    assert api.get(f"/api/listings/{created['id']}").status_code == 200

    updated_payload = listing_payload("Updated Stay")
    updated = api.put(f"/api/listings/{created['id']}", json=updated_payload)
    assert updated.json()["name"] == "Updated Stay"
    assert api.delete(f"/api/listings/{created['id']}").status_code == 204
    assert api.get(f"/api/listings/{created['id']}").status_code == 404


def test_enquiry_creation(tmp_path):
    api = client(tmp_path)
    listing = api.post("/api/listings", json=listing_payload()).json()
    response = api.post(
        "/api/enquiries",
        json={
            "listing_id": listing["id"],
            "name": "Lerato",
            "cellphone": "+27820000000",
            "message": "Is next weekend open?",
            "otp_verified": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["listing_id"] == listing["id"]
    assert len(api.get("/api/enquiries").json()) == 1


def test_otp_placeholder(tmp_path):
    api = client(tmp_path)
    requested = api.post("/api/otp/request", json={"cellphone": "+27820000000"})
    verified = api.post(
        "/api/otp/verify",
        json={"cellphone": "+27820000000", "code": "1234"},
    )
    assert requested.json()["status"] == "placeholder"
    assert verified.json()["otp_verified"] is True
