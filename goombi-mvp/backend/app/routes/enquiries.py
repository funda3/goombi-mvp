from fastapi import APIRouter, HTTPException, Request, status

from ..models import Enquiry, EnquiryCreate


router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])


@router.get("", response_model=list[Enquiry])
def get_enquiries(request: Request) -> list[Enquiry]:
    return request.app.state.store.list_enquiries()


@router.post("", response_model=Enquiry, status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryCreate, request: Request) -> Enquiry:
    if not request.app.state.store.get_listing(payload.listing_id):
        raise HTTPException(status_code=404, detail="Listing not found")
    return request.app.state.store.create_enquiry(payload)
