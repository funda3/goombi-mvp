import json
import pathlib

import pytest
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


# ── GMB-01: listing_type and partner_status tests ──────────────────────────────

def test_listing_type_defaults(tmp_path):
    """POST without listing_type → response has listing_type='accommodation' (derived from category)."""
    api = client(tmp_path)
    payload = listing_payload()
    assert "listing_type" not in payload
    created = api.post("/api/listings", json=payload).json()
    assert created["listing_type"] == "accommodation"


def test_partner_status_defaults(tmp_path):
    """POST without partner_status → response has partner_status='seed'."""
    api = client(tmp_path)
    payload = listing_payload()
    assert "partner_status" not in payload
    created = api.post("/api/listings", json=payload).json()
    assert created["partner_status"] == "seed"


def test_explicit_listing_type_preserved(tmp_path):
    """POST with listing_type='tourism_experience' → response preserves it."""
    api = client(tmp_path)
    payload = {**listing_payload(), "listing_type": "tourism_experience"}
    created = api.post("/api/listings", json=payload).json()
    assert created["listing_type"] == "tourism_experience"


def test_invalid_listing_type_rejected(tmp_path):
    """POST with listing_type='hotel' (not in Literal) → 422 Unprocessable Entity."""
    api = client(tmp_path)
    payload = {**listing_payload(), "listing_type": "hotel"}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


def test_property_opportunity_rejected(tmp_path):
    """POST with listing_type='property_opportunity' is rejected — Goombi is not a property platform."""
    api = client(tmp_path)
    payload = {**listing_payload(), "listing_type": "property_opportunity"}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


def test_business_hub_rejected(tmp_path):
    """POST with listing_type='business_hub' is rejected — Goombi is not a business-intelligence platform."""
    api = client(tmp_path)
    payload = {**listing_payload(), "listing_type": "business_hub"}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


def test_relocation_zone_rejected(tmp_path):
    """POST with listing_type='relocation_zone' is rejected — Relocation layer removed in GMB-01F."""
    api = client(tmp_path)
    payload = {**listing_payload(), "listing_type": "relocation_zone"}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


def test_invalid_partner_status_rejected(tmp_path):
    """POST with partner_status='partner' (not in Literal) → 422 Unprocessable Entity."""
    api = client(tmp_path)
    payload = {**listing_payload(), "partner_status": "partner"}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


# ── GMB-01D: rooms/max_guests nullable for non-accommodation layers ───────────

def _seed_client(tmp_path) -> TestClient:
    seed_path = pathlib.Path(__file__).parent.parent / "app" / "data" / "listings.json"
    listings_path = tmp_path / "listings.json"
    enquiries_path = tmp_path / "enquiries.json"
    listings_path.write_text(seed_path.read_text(encoding="utf-8"), encoding="utf-8")
    enquiries_path.write_text("[]", encoding="utf-8")
    return TestClient(create_app(JsonStore(listings_path, enquiries_path)))


def test_get_listings_returns_200_with_seed_data(tmp_path):
    """GET /api/listings with seed data returns 200 and at least one record."""
    api = _seed_client(tmp_path)
    response = api.get("/api/listings")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_seed_contains_accommodation(tmp_path):
    """Seed data must include at least one accommodation record."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    accommodation = [r for r in data if r.get("listing_type") == "accommodation"]
    assert len(accommodation) > 0


def test_seed_contains_workspace(tmp_path):
    """Seed data must include at least one workspace record."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    workspaces = [r for r in data if r.get("listing_type") == "workspace"]
    assert len(workspaces) > 0


def test_seed_contains_estate_living_zone(tmp_path):
    """Seed data must include at least one estate_living_zone record."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    estates = [r for r in data if r.get("listing_type") == "estate_living_zone"]
    assert len(estates) >= 1


# ── GMB-01G: estate marker batch ──────────────────────────────────────────────

def test_seed_has_at_least_15_estate_living_zones(tmp_path):
    """After GMB-01G there must be at least 15 estate_living_zone records."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    estates = [r for r in data if r.get("listing_type") == "estate_living_zone"]
    assert len(estates) >= 15, f"Expected >=15 estates, got {len(estates)}"


def test_seed_has_western_cape_estates(tmp_path):
    """Seed must include at least one Western Cape estate_living_zone."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    wc = [r for r in data if r.get("listing_type") == "estate_living_zone" and r.get("province") == "Western Cape"]
    assert len(wc) >= 1, f"Expected Western Cape estates, found none"


def test_seed_has_kzn_estates(tmp_path):
    """Seed must include at least one KwaZulu-Natal estate_living_zone."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    kzn = [r for r in data if r.get("listing_type") == "estate_living_zone" and r.get("province") == "KwaZulu-Natal"]
    assert len(kzn) >= 1, f"Expected KwaZulu-Natal estates, found none"


def test_val_de_vie_estate_exists_in_seed(tmp_path):
    """Val de Vie Estate must be present in seed data."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    found = [r for r in data if "Val de Vie Estate" in r.get("name", "")]
    assert len(found) >= 1, "Val de Vie Estate not found in seed"


def test_zimbali_estate_exists_in_seed(tmp_path):
    """Zimbali Estate must be present in seed data."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    found = [r for r in data if "Zimbali" in r.get("name", "")]
    assert len(found) >= 1, "Zimbali Estate not found in seed"


def test_estate_records_have_null_rooms(tmp_path):
    """All estate_living_zone records must have null rooms and max_guests."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    estates = [r for r in data if r.get("listing_type") == "estate_living_zone"]
    assert len(estates) > 0
    for estate in estates:
        assert estate.get("rooms") is None, f"{estate['name']} has non-null rooms"
        assert estate.get("max_guests") is None, f"{estate['name']} has non-null max_guests"


def test_estate_records_have_valid_coordinates(tmp_path):
    """Estate records must have coordinates within the South Africa bounding box."""
    # SA rough bounding box: lat -35 to -22, lng 16 to 33
    data = _seed_client(tmp_path).get("/api/listings").json()
    estates = [r for r in data if r.get("listing_type") == "estate_living_zone"]
    assert len(estates) > 0
    for estate in estates:
        lat = estate.get("latitude")
        lng = estate.get("longitude")
        assert lat is not None and lng is not None, f"{estate['name']} missing coordinates"
        assert -35.0 <= lat <= -22.0, f"{estate['name']} latitude {lat} outside SA bounds"
        assert 16.0 <= lng <= 33.0, f"{estate['name']} longitude {lng} outside SA bounds"


def test_seed_has_no_relocation_zone(tmp_path):
    """Seed data must contain zero relocation_zone records after GMB-01F."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    relocation = [r for r in data if r.get("listing_type") == "relocation_zone"]
    assert len(relocation) == 0


def test_non_accommodation_with_null_rooms_validates(tmp_path):
    """Non-accommodation records with rooms=null and max_guests=null validate successfully."""
    api = client(tmp_path)
    payload = {
        **listing_payload(),
        "listing_type": "restaurant",
        "rooms": None,
        "max_guests": None,
    }
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    assert response.json()["rooms"] is None
    assert response.json()["max_guests"] is None


def test_non_accommodation_with_zero_rooms_coerced_to_null(tmp_path):
    """Non-accommodation records with rooms=0 / max_guests=0 are normalised to null."""
    api = client(tmp_path)
    payload = {
        **listing_payload(),
        "listing_type": "transport_node",
        "rooms": 0,
        "max_guests": 0,
    }
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    assert response.json()["rooms"] is None
    assert response.json()["max_guests"] is None


def test_accommodation_missing_rooms_defaults_to_1(tmp_path):
    """Accommodation records with missing rooms/max_guests are defaulted to 1."""
    api = client(tmp_path)
    payload = listing_payload()
    payload.pop("rooms", None)
    payload.pop("max_guests", None)
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    assert response.json()["rooms"] == 1
    assert response.json()["max_guests"] == 1


def test_accommodation_zero_rooms_normalised_to_1(tmp_path):
    """Accommodation records with rooms=0 / max_guests=0 are normalised to 1."""
    api = client(tmp_path)
    payload = {**listing_payload(), "rooms": 0, "max_guests": 0}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    assert response.json()["rooms"] == 1
    assert response.json()["max_guests"] == 1


def test_estate_with_null_rooms_validates(tmp_path):
    """Estate living zone records with null rooms and max_guests validate successfully."""
    api = client(tmp_path)
    payload = {
        **listing_payload(),
        "listing_type": "estate_living_zone",
        "rooms": None,
        "max_guests": None,
        "estate_type": "Parkland Residence",
        "lifestyle_summary": "Luxury estate living in Johannesburg North.",
    }
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    assert response.json()["rooms"] is None
    assert response.json()["max_guests"] is None
    assert response.json()["listing_type"] == "estate_living_zone"


# ── GMB-01E / GMB-01F: all 7 valid listing_type values can be posted and retrieved

_ALL_LAYER_PAYLOADS = [
    ("accommodation", {
        "listing_type": "accommodation",
        "rooms": 2,
        "max_guests": 4,
    }),
    ("workspace", {
        "listing_type": "workspace",
        "category": "workspace",
        "provider_name": "Workshop17",
        "workspace_type": "coworking",
        "pricing_status": "not_publicly_available",
        "source_url": "https://example.com",
        "source_note": "Public provider page.",
        "rooms": None,
        "max_guests": None,
    }),
    ("tourism_experience", {
        "listing_type": "tourism_experience",
        "rooms": None,
        "max_guests": None,
        "capacity": 20,
    }),
    ("restaurant", {
        "listing_type": "restaurant",
        "rooms": None,
        "max_guests": None,
    }),
    ("transport_node", {
        "listing_type": "transport_node",
        "rooms": None,
        "max_guests": None,
    }),
    ("estate_living_zone", {
        "listing_type": "estate_living_zone",
        "rooms": None,
        "max_guests": None,
    }),
    ("event_space", {
        "listing_type": "event_space",
        "rooms": None,
        "max_guests": None,
        "capacity": 200,
    }),
]


@pytest.mark.parametrize("layer_name,overrides", _ALL_LAYER_PAYLOADS)
def test_each_listing_type_can_be_created(tmp_path, layer_name, overrides):
    """Every valid listingType can be POST-ed and round-trips through the API as 201."""
    api = client(tmp_path)
    base = listing_payload(f"{layer_name.title()} Demo")
    base.pop("rooms", None)
    base.pop("max_guests", None)
    payload = {**base, **overrides}
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201, f"{layer_name} POST failed: {response.text}"
    data = response.json()
    assert data["listing_type"] == layer_name


@pytest.mark.parametrize("layer_name,overrides", _ALL_LAYER_PAYLOADS)
def test_each_listing_type_appears_in_get_all(tmp_path, layer_name, overrides):
    """Every valid listingType that is created appears in GET /api/listings."""
    api = client(tmp_path)
    base = listing_payload(f"{layer_name.title()} Demo")
    base.pop("rooms", None)
    base.pop("max_guests", None)
    payload = {**base, **overrides}
    created = api.post("/api/listings", json=payload).json()
    all_listings = api.get("/api/listings").json()
    assert any(l["id"] == created["id"] for l in all_listings), f"{layer_name} not found in GET /api/listings"


def test_old_seed_record_loads(tmp_path):
    """Old-format JSON without listing_type/partner_status can be read by list_listings().
    The model_validator defaults them to 'accommodation' and 'seed' respectively.
    """
    listings_path = tmp_path / "listings.json"
    enquiries_path = tmp_path / "enquiries.json"
    old_record = {
        "id": "legacy-001",
        "name": "Legacy Stay",
        "category": "guesthouse",
        "province": "Gauteng",
        "city": "Johannesburg",
        "suburb": "Bryanston",
        "address": "Old address",
        "latitude": -26.053,
        "longitude": 28.024,
        "price_per_night": 800,
        "max_guests": 2,
        "rooms": 1,
        "description": "Legacy record without new fields.",
        "amenities": [],
        "photos": [],
        "owner_name": "Old Owner",
        "owner_phone": "+27110000000",
        "verified_status": False,
        "source_type": "manual_seed",
        "created_at": "2025-01-01T00:00:00+00:00",
        "updated_at": "2025-01-01T00:00:00+00:00",
    }
    listings_path.write_text(json.dumps([old_record]), encoding="utf-8")
    enquiries_path.write_text("[]", encoding="utf-8")
    store = JsonStore(listings_path, enquiries_path)
    listings = store.list_listings()
    assert len(listings) == 1
    assert listings[0].listing_type == "accommodation"
    assert listings[0].partner_status == "seed"
