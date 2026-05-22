from fastapi import APIRouter, HTTPException, Request, Response, status

from ..models import Listing, ListingCreate, ListingUpdate


router = APIRouter(prefix="/api/listings", tags=["listings"])


def store(request: Request):
    return request.app.state.store


@router.get("", response_model=list[Listing])
def get_listings(request: Request) -> list[Listing]:
    return store(request).list_listings()


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
