from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from ..models import Listing, ListingCreate, ListingUpdate


router = APIRouter(prefix="/api/listings", tags=["listings"])

PUBLIC_RESTAURANT_SOURCES = {"provider_approved", "manual_public_source"}


def store(request: Request):
    return request.app.state.store


def is_public_listing(item: Listing) -> bool:
    is_restaurant = item.category == "restaurant" or item.listing_type == "restaurant"
    if not is_restaurant:
        return True
    return item.category == "restaurant" and item.source_type in PUBLIC_RESTAURANT_SOURCES


@router.get("", response_model=list[Listing])
def get_listings(request: Request, category: str | None = Query(default=None)) -> list[Listing]:
    listings = [item for item in store(request).list_listings() if is_public_listing(item)]
    if category:
        listings = [
            item for item in listings
            if item.category == category or item.listing_type == category
        ]
    return listings


@router.get("/{listing_id}", response_model=Listing)
def get_listing(listing_id: str, request: Request) -> Listing:
    listing = store(request).get_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("", response_model=Listing, status_code=status.HTTP_201_CREATED)
def create_listing(payload: ListingCreate, request: Request) -> Listing:
    return store(request).create_listing(payload)


@router.put("/{listing_id}", response_model=Listing)
def update_listing(listing_id: str, payload: ListingUpdate, request: Request) -> Listing:
    listing = store(request).update_listing(listing_id, payload)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(listing_id: str, request: Request) -> Response:
    if not store(request).delete_listing(listing_id):
        raise HTTPException(status_code=404, detail="Listing not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
