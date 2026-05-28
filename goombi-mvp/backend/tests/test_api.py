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
    events_path = tmp_path / "events.json"
    nightlife_path = tmp_path / "nightlife.json"
    restaurant_prospects_path = tmp_path / "restaurant_prospects.json"
    provider_crm_path = tmp_path / "provider_crm.json"
    listings_path.write_text("[]", encoding="utf-8")
    enquiries_path.write_text("[]", encoding="utf-8")
    restaurant_prospects_path.write_text("[]", encoding="utf-8")
    provider_crm_path.write_text("[]", encoding="utf-8")
    seed_events = pathlib.Path(__file__).parent.parent / "app" / "data" / "events.json"
    seed_nightlife = pathlib.Path(__file__).parent.parent / "app" / "data" / "nightlife.json"
    events_path.write_text(seed_events.read_text(encoding="utf-8"), encoding="utf-8")
    nightlife_path.write_text(seed_nightlife.read_text(encoding="utf-8"), encoding="utf-8")
    return TestClient(create_app(JsonStore(listings_path, enquiries_path, events_path, nightlife_path, restaurant_prospects_path, provider_crm_path)))


def restaurant_prospect_payload(name: str = "Prospect Kitchen") -> dict:
    return {
        "name": name,
        "province": "Gauteng",
        "city": "Johannesburg",
        "suburb": "Sandton",
        "cuisine_tags": ["South African", "Grill"],
        "price_band": "$$",
        "source_document": "Goombi_TA_Gauteng_Restaurants.docx",
        "source_type": "restaurant_audit_seed",
        "audit_status": "prospect_only",
        "approval_status": "prospect_only",
        "public_website_url": "",
        "public_contact_url": "",
        "notes_internal": "Internal prospect seed only. Do not publish TA-derived metrics or notes.",
        "latitude": -26.1076,
        "longitude": 28.0567,
        "coordinate_accuracy": "city_or_suburb_centroid_estimate",
    }


def crm_payload(provider_record_id: str = "restaurant-prospect-1", name: str = "Prospect Kitchen") -> dict:
    return {
        "provider_type": "restaurant",
        "provider_record_id": provider_record_id,
        "provider_name": name,
        "province": "Gauteng",
        "city": "Johannesburg",
        "current_status": "prospect_only",
        "assigned_to": "operator",
        "priority": "high",
        "outreach_channel": "whatsapp",
        "outreach_note": "Initial outreach queue.",
        "next_followup_date": None,
        "loi_sent_at": None,
        "loi_signed_at": None,
        "provider_approved_at": None,
        "public_listing_created_at": None,
    }


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


def test_restaurant_prospect_crud(tmp_path):
    api = client(tmp_path)
    created = api.post("/api/restaurant-prospects", json=restaurant_prospect_payload()).json()
    assert created["name"] == "Prospect Kitchen"
    assert created["audit_status"] == "prospect_only"
    assert created["approval_status"] == "prospect_only"
    assert created["source_type"] == "restaurant_audit_seed"

    listed = api.get("/api/restaurant-prospects").json()
    assert listed[0]["id"] == created["id"]
    assert api.get(f"/api/restaurant-prospects/{created['id']}").status_code == 200

    update_payload = restaurant_prospect_payload("Approved Kitchen")
    update_payload["approval_status"] = "provider_approved"
    updated = api.put(f"/api/restaurant-prospects/{created['id']}", json=update_payload)
    assert updated.status_code == 200
    assert updated.json()["approval_status"] == "provider_approved"

    assert api.delete(f"/api/restaurant-prospects/{created['id']}").status_code == 204
    assert api.get(f"/api/restaurant-prospects/{created['id']}").status_code == 404


def test_restaurant_prospects_are_separate_from_public_listings(tmp_path):
    api = client(tmp_path)
    created = api.post("/api/restaurant-prospects", json=restaurant_prospect_payload()).json()
    assert created["name"] == "Prospect Kitchen"
    public_listings = api.get("/api/listings").json()
    assert all(item["name"] != "Prospect Kitchen" for item in public_listings)


def test_restaurant_prospect_seed_includes_kzn_records(tmp_path):
    api = _seed_client(tmp_path)
    response = api.get("/api/restaurant-prospects", params={"province": "KwaZulu-Natal"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 60
    assert all(item["province"] == "KwaZulu-Natal" for item in data)
    assert any(item["city"] == "Durban" for item in data)
    assert any(item["city"] == "St Lucia" for item in data)


def test_restaurant_prospect_filters_by_city_approval_and_audit_status(tmp_path):
    api = _seed_client(tmp_path)
    response = api.get(
        "/api/restaurant-prospects",
        params={
            "province": "KwaZulu-Natal",
            "city": "Ballito",
            "approval_status": "prospect_only",
            "audit_status": "prospect_only",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all(item["province"] == "KwaZulu-Natal" for item in data)
    assert all(item["city"] == "Ballito" for item in data)
    assert all(item["approval_status"] == "prospect_only" for item in data)
    assert all(item["audit_status"] == "prospect_only" for item in data)


def test_kzn_restaurant_prospects_default_to_internal_seed_statuses(tmp_path):
    api = _seed_client(tmp_path)
    data = api.get("/api/restaurant-prospects", params={"province": "KwaZulu-Natal"}).json()
    assert len(data) > 0
    for item in data:
        assert item["source_type"] == "restaurant_audit_seed"
        assert item["audit_status"] == "prospect_only"
        assert item["approval_status"] == "prospect_only"
        assert item["coordinate_accuracy"] == "approximate"


def test_public_listings_contain_no_restaurant_audit_seed_records(tmp_path):
    api = _seed_client(tmp_path)
    public_listings = api.get("/api/listings").json()
    assert [item for item in public_listings if item.get("source_type") == "restaurant_audit_seed"] == []
    assert [
        item for item in public_listings
        if item.get("listing_type") == "restaurant" and item.get("source_type") == "manual_seed"
    ] == []


def test_public_listings_include_approved_demo_restaurants(tmp_path):
    api = _seed_client(tmp_path)
    public_listings = api.get("/api/listings").json()
    demo_restaurants = {
        item["id"]: item
        for item in public_listings
        if item.get("category") == "restaurant" and item.get("source_type") == "manual_public_source"
    }

    assert {"demo-restaurant-sandton-bistro", "demo-restaurant-cape-town-food-hall", "demo-restaurant-durban-grill"} <= set(demo_restaurants)
    assert all(item["verified_status"] == "demo_verified" for item in demo_restaurants.values())
    assert all("not sourced from TripAdvisor" in item.get("source_note", "") for item in demo_restaurants.values())


def test_listing_category_filter_returns_restaurants(tmp_path):
    api = _seed_client(tmp_path)
    response = api.get("/api/listings", params={"category": "restaurant"})
    assert response.status_code == 200
    restaurants = response.json()

    assert len(restaurants) >= 3
    assert all(item.get("category") == "restaurant" or item.get("listing_type") == "restaurant" for item in restaurants)
    assert any(item["id"] == "demo-restaurant-sandton-bistro" for item in restaurants)


def test_provider_crm_crud_and_filters(tmp_path):
    api = client(tmp_path)
    created = api.post("/api/provider-crm", json=crm_payload()).json()
    assert created["provider_name"] == "Prospect Kitchen"
    assert created["current_status"] == "prospect_only"

    filtered = api.get(
        "/api/provider-crm",
        params={
            "provider_type": "restaurant",
            "province": "Gauteng",
            "city": "Johannesburg",
            "current_status": "prospect_only",
            "priority": "high",
            "assigned_to": "operator",
        },
    ).json()
    assert [item["id"] for item in filtered] == [created["id"]]

    updated_payload = {**crm_payload(name="Updated Kitchen"), "current_status": "contacted"}
    updated = api.put(f"/api/provider-crm/{created['id']}", json=updated_payload)
    assert updated.status_code == 200
    assert updated.json()["current_status"] == "contacted"
    assert api.delete(f"/api/provider-crm/{created['id']}").status_code == 204
    assert api.get(f"/api/provider-crm/{created['id']}").status_code == 404


def test_provider_crm_seed_imports_restaurant_prospects(tmp_path):
    api = _seed_client(tmp_path)
    records = api.get("/api/provider-crm", params={"provider_type": "restaurant"}).json()
    assert len(records) >= 200
    assert all(item["current_status"] == "prospect_only" for item in records)


def test_provider_approval_required_before_public_marker_creation(tmp_path):
    api = client(tmp_path)
    prospect = api.post("/api/restaurant-prospects", json=restaurant_prospect_payload()).json()
    crm = api.post("/api/provider-crm", json=crm_payload(prospect["id"], prospect["name"])).json()

    response = api.post(f"/api/provider-crm/{crm['id']}/create-public-listing")
    assert response.status_code == 409
    assert "provider approval" in response.json()["detail"]
    public_listings = api.get("/api/listings").json()
    assert all(item.get("source_type") != "restaurant_audit_seed" for item in public_listings)


def test_public_marker_creation_updates_crm_status(tmp_path):
    api = client(tmp_path)
    prospect = api.post("/api/restaurant-prospects", json=restaurant_prospect_payload()).json()
    crm = api.post(
        "/api/provider-crm",
        json={**crm_payload(prospect["id"], prospect["name"]), "current_status": "provider_approved"},
    ).json()

    response = api.post(f"/api/provider-crm/{crm['id']}/create-public-listing")
    assert response.status_code == 200
    payload = response.json()
    assert payload["crm"]["current_status"] == "public_marker_live"
    assert payload["crm"]["public_listing_created_at"] is not None
    assert payload["listing"]["source_type"] == "provider_approved"
    assert payload["listing"]["listing_type"] == "restaurant"


def test_get_events_returns_seed_records(tmp_path):
    api = client(tmp_path)
    response = api.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(event["name"] == "Durban July" for event in data)


def test_get_event_by_id(tmp_path):
    api = client(tmp_path)
    event_id = "event-kzn-durban-july"
    response = api.get(f"/api/events/{event_id}")
    assert response.status_code == 200
    event = response.json()
    assert event["id"] == event_id
    assert event["province"] == "KwaZulu-Natal"


def test_get_events_filters_by_province_and_category(tmp_path):
    api = client(tmp_path)
    response = api.get("/api/events", params={"province": "Western Cape", "category": "market"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all(item["province"] == "Western Cape" for item in data)
    assert all(item["category"] == "market" for item in data)


def test_get_nightlife_returns_seed_records(tmp_path):
    api = client(tmp_path)
    response = api.get("/api/nightlife")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(venue["name"] == "Konka Soweto" for venue in data)


def test_get_nightlife_by_id(tmp_path):
    api = client(tmp_path)
    venue_id = "nightlife-gp-konka-soweto"
    response = api.get(f"/api/nightlife/{venue_id}")
    assert response.status_code == 200
    venue = response.json()
    assert venue["id"] == venue_id
    assert venue["verified_status"] == "unverified_public_research"


def test_get_nightlife_filters_by_province(tmp_path):
    api = client(tmp_path)
    response = api.get("/api/nightlife", params={"province": "Western Cape"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all(item["province"] == "Western Cape" for item in data)


def test_get_nightlife_filters_by_music_focus(tmp_path):
    api = client(tmp_path)
    response = api.get("/api/nightlife", params={"music_focus": "amapiano"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all("amapiano" in item["music_focus"] for item in data)


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


def test_seed_excludes_estate_living_zone_from_public_listings(tmp_path):
    """Estate records may exist in seed data but must never appear in public /api/listings."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    estates = [r for r in data if r.get("listing_type") == "estate_living_zone"]
    assert estates == []


def test_get_listing_returns_404_for_estate_record(tmp_path):
    """Estate listing IDs must resolve to 404 on public detail endpoint."""
    api = _seed_client(tmp_path)
    response = api.get("/api/listings/demo-estate-waterfall-01")
    assert response.status_code == 404


def test_seed_has_no_relocation_zone(tmp_path):
    """Seed data must contain zero relocation_zone records after GMB-01F."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    relocation = [r for r in data if r.get("listing_type") == "relocation_zone"]
    assert len(relocation) == 0


# ── GMB-01I: province / region normalization and seed integrity ───────────────

def test_all_seed_listings_have_region(tmp_path):
    """Every listing in seed data must have a non-empty region after GMB-01I."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    missing = [r["id"] for r in data if not r.get("region")]
    assert missing == [], f"Listings missing region: {missing}"


def test_all_seed_listings_have_province(tmp_path):
    """Every listing in seed data must have a non-empty province."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    missing = [r["id"] for r in data if not r.get("province")]
    assert missing == [], f"Listings missing province: {missing}"


def test_seed_region_equals_province(tmp_path):
    """For every seed listing region must equal province."""
    data = _seed_client(tmp_path).get("/api/listings").json()
    mismatches = [
        r["id"] for r in data
        if r.get("region") and r.get("province") and r["region"] != r["province"]
    ]
    assert mismatches == [], f"region != province for: {mismatches}"


def test_public_restaurant_prospect_payload_excludes_internal_fields(tmp_path, monkeypatch):
    """Public demo payload must only expose safe restaurant prospect fields."""
    monkeypatch.setenv("SHOW_RESTAURANT_PROSPECTS_ON_MAP", "true")
    api = _seed_client(tmp_path)
    response = api.get("/api/restaurant-prospects/public")
    assert response.status_code == 200

    payload = response.json()
    assert "restaurants" in payload
    assert "counts" in payload
    assert len(payload["restaurants"]) > 0

    sample = payload["restaurants"][0]
    expected_keys = {
        "id",
        "name",
        "province",
        "city",
        "suburb",
        "cuisine_tags",
        "price_band",
        "latitude",
        "longitude",
        "approval_status",
        "demo_visibility",
    }
    assert set(sample.keys()) == expected_keys
    assert sample["demo_visibility"] is True
    assert "notes_internal" not in sample
    assert "source_document" not in sample
    assert "public_contact_url" not in sample
    assert "public_website_url" not in sample


def test_public_restaurant_prospect_payload_respects_flag(tmp_path, monkeypatch):
    """Without demo flag, public prospects endpoint should only expose approved prospects."""
    monkeypatch.delenv("SHOW_RESTAURANT_PROSPECTS_ON_MAP", raising=False)
    api = client(tmp_path)

    pending = restaurant_prospect_payload("Pending Kitchen")
    approved = restaurant_prospect_payload("Approved Kitchen")
    approved["approval_status"] = "provider_approved"

    api.post("/api/restaurant-prospects", json=pending)
    api.post("/api/restaurant-prospects", json=approved)

    payload = api.get("/api/restaurant-prospects/public").json()
    assert len(payload["restaurants"]) == 1
    assert all(item["approval_status"] == "provider_approved" for item in payload["restaurants"])


def test_nearby_services_fallback_works(tmp_path, monkeypatch):
    """If the nearby services upstream call fails, API must return a fallback response."""
    import httpx

    def _boom(*args, **kwargs):
        raise httpx.HTTPError("upstream unavailable")

    monkeypatch.setattr(httpx, "post", _boom)
    api = _seed_client(tmp_path)
    response = api.get("/api/nearby-services", params={"lat": -26.1, "lon": 28.0})
    assert response.status_code == 200
    assert response.json() == {"services": [], "status": "fallback"}


def test_province_without_region_is_normalised(tmp_path):
    """POST with province but no region normalises region = province."""
    api = client(tmp_path)
    payload = listing_payload()
    payload.pop("region", None)
    payload["province"] = "Western Cape"
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["region"] == "Western Cape"
    assert data["province"] == "Western Cape"


def test_region_without_province_is_normalised(tmp_path):
    """POST with region but province='' normalises province = region.

    province has a model default of 'Gauteng', so the only way to trigger the
    region->province normalization path is to send province="" explicitly.
    """
    api = client(tmp_path)
    payload = listing_payload()
    payload["province"] = ""
    payload["region"] = "KwaZulu-Natal"
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["province"] == "KwaZulu-Natal"
    assert data["region"] == "KwaZulu-Natal"


def test_missing_both_province_and_region_is_rejected(tmp_path):
    """POST with neither province nor region must be rejected with 422."""
    api = client(tmp_path)
    payload = listing_payload()
    payload.pop("province", None)
    payload.pop("region", None)
    # province has a model default of "Gauteng", so we must explicitly clear it
    # by passing province="" and region="" to trigger the validator
    payload["province"] = ""
    payload["region"] = ""
    response = api.post("/api/listings", json=payload)
    assert response.status_code == 422


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


def test_estate_listing_is_not_returned_in_public_get_all(tmp_path):
    """Estate records can be created internally but must be hidden from public GET listings."""
    api = client(tmp_path)
    payload = {
        **listing_payload(),
        "listing_type": "estate_living_zone",
        "rooms": None,
        "max_guests": None,
        "estate_type": "Parkland Residence",
        "lifestyle_summary": "Luxury estate living in Johannesburg North.",
    }
    created = api.post("/api/listings", json=payload).json()
    all_listings = api.get("/api/listings").json()
    assert all(item["id"] != created["id"] for item in all_listings)


# ── Public layers: all non-estate listing types can be posted and retrieved

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
        "category": "restaurant",
        "listing_type": "restaurant",
        "rooms": None,
        "max_guests": None,
        "source_type": "manual_public_source",
    }),
    ("transport_node", {
        "listing_type": "transport_node",
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
