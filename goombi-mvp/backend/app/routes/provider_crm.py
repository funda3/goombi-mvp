from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from ..models import ListingCreate, ProviderCrm, ProviderCrmCreate, ProviderCrmUpdate, utc_now


router = APIRouter(prefix="/api/provider-crm", tags=["provider-crm"])

COMPLIANCE_NOTE = (
    "Public listing creation requires provider approval or licensed/publicly permitted source confirmation."
)


@router.get("", response_model=list[ProviderCrm])
def get_provider_crm(
    request: Request,
    provider_type: str | None = Query(default=None),
    province: str | None = Query(default=None),
    city: str | None = Query(default=None),
    current_status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    assigned_to: str | None = Query(default=None),
) -> list[ProviderCrm]:
    records = request.app.state.store.list_provider_crm()
    if provider_type:
        records = [item for item in records if item.provider_type == provider_type]
    if province:
        records = [item for item in records if item.province == province]
    if city:
        records = [item for item in records if item.city == city]
    if current_status:
        records = [item for item in records if item.current_status == current_status]
    if priority:
        records = [item for item in records if item.priority == priority]
    if assigned_to:
        records = [item for item in records if item.assigned_to == assigned_to]
    return records


@router.get("/{crm_id}", response_model=ProviderCrm)
def get_provider_crm_record(crm_id: str, request: Request) -> ProviderCrm:
    record = request.app.state.store.get_provider_crm(crm_id)
    if not record:
        raise HTTPException(status_code=404, detail="CRM record not found")
    return record


@router.post("", response_model=ProviderCrm, status_code=status.HTTP_201_CREATED)
def create_provider_crm(payload: ProviderCrmCreate, request: Request) -> ProviderCrm:
    return request.app.state.store.create_provider_crm(payload)


@router.put("/{crm_id}", response_model=ProviderCrm)
def update_provider_crm(crm_id: str, payload: ProviderCrmUpdate, request: Request) -> ProviderCrm:
    record = request.app.state.store.update_provider_crm(crm_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="CRM record not found")
    return record


@router.delete("/{crm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider_crm(crm_id: str, request: Request) -> Response:
    if not request.app.state.store.delete_provider_crm(crm_id):
        raise HTTPException(status_code=404, detail="CRM record not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{crm_id}/create-public-listing")
def create_public_listing_from_crm(crm_id: str, request: Request) -> dict[str, object]:
    crm = request.app.state.store.get_provider_crm(crm_id)
    if not crm:
        raise HTTPException(status_code=404, detail="CRM record not found")
    if crm.current_status != "provider_approved":
        raise HTTPException(status_code=409, detail=f"{COMPLIANCE_NOTE} CRM status must be provider_approved.")

    listing = _listing_payload_from_crm(crm, request)
    created = request.app.state.store.create_listing(listing)
    timestamp = utc_now()
    updated = request.app.state.store.patch_provider_crm(
        crm_id,
        {
            "current_status": "public_marker_live",
            "public_listing_created_at": timestamp,
        },
    )
    return {"crm": updated, "listing": created, "compliance_note": COMPLIANCE_NOTE}


def _listing_payload_from_crm(crm: ProviderCrm, request: Request) -> ListingCreate:
    if crm.provider_type == "restaurant":
        prospect = request.app.state.store.get_restaurant_prospect(crm.provider_record_id)
        if not prospect:
            raise HTTPException(status_code=404, detail="Restaurant prospect not found")
        return ListingCreate(
            name=prospect.name,
            category="restaurant",
            listing_type="restaurant",
            partner_status="active",
            province=prospect.province,
            region=prospect.province,
            city=prospect.city,
            suburb=prospect.suburb,
            address=f"{prospect.suburb}, {prospect.city}",
            latitude=prospect.latitude,
            longitude=prospect.longitude,
            price_per_night=0,
            max_guests=None,
            rooms=None,
            description="Provider-approved Goombi restaurant marker.",
            description_goombi="Provider-approved Goombi restaurant marker.",
            amenities=[],
            photos=[],
            owner_name="Restaurant provider",
            owner_phone="",
            cuisine_tags=prospect.cuisine_tags,
            price_band_goombi=prospect.price_band,
            provider_type=", ".join(prospect.cuisine_tags),
            website_url=prospect.public_website_url,
            booking_url=prospect.public_contact_url or prospect.public_website_url,
            verified_status=True,
            source_type="provider_approved",
            source_note=f"{COMPLIANCE_NOTE} Converted from CRM record {crm.id}.",
        )

    listing_type = {
        "accommodation": "accommodation",
        "workspace": "workspace",
        "nightlife": "restaurant",
        "event": "event_space",
    }[crm.provider_type]
    category = "workspace" if crm.provider_type == "workspace" else "accommodation"
    if crm.provider_type == "nightlife":
        category = "restaurant"

    return ListingCreate(
        name=crm.provider_name,
        category=category,
        listing_type=listing_type,
        partner_status="active",
        province=crm.province,
        region=crm.province,
        city=crm.city,
        suburb=crm.city,
        address=f"{crm.city}, {crm.province}",
        latitude=-29.0 if crm.province == "KwaZulu-Natal" else -26.1,
        longitude=31.0 if crm.province == "KwaZulu-Natal" else 28.05,
        price_per_night=0,
        max_guests=None,
        rooms=None,
        description="Provider-approved Goombi public marker.",
        amenities=[],
        photos=[],
        owner_name="Provider",
        owner_phone="",
        verified_status=True,
        source_type="provider_approved",
        source_note=f"{COMPLIANCE_NOTE} Converted from CRM record {crm.id}.",
    )
