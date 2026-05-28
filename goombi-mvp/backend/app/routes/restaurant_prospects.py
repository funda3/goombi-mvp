from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from ..models import RestaurantProspect, RestaurantProspectCreate, RestaurantProspectUpdate


router = APIRouter(prefix="/api/restaurant-prospects", tags=["restaurant-prospects"])


@router.get("", response_model=list[RestaurantProspect])
def get_restaurant_prospects(
    request: Request,
    province: str | None = Query(default=None),
    city: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    audit_status: str | None = Query(default=None),
) -> list[RestaurantProspect]:
    prospects = request.app.state.store.list_restaurant_prospects()
    if province:
        prospects = [item for item in prospects if item.province == province]
    if city:
        prospects = [item for item in prospects if item.city == city]
    if approval_status:
        prospects = [item for item in prospects if item.approval_status == approval_status]
    if audit_status:
        prospects = [item for item in prospects if item.audit_status == audit_status]
    return prospects


@router.get("/{prospect_id}", response_model=RestaurantProspect)
def get_restaurant_prospect(prospect_id: str, request: Request) -> RestaurantProspect:
    prospect = request.app.state.store.get_restaurant_prospect(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Restaurant prospect not found")
    return prospect


@router.post("", response_model=RestaurantProspect, status_code=status.HTTP_201_CREATED)
def create_restaurant_prospect(
    payload: RestaurantProspectCreate, request: Request
) -> RestaurantProspect:
    return request.app.state.store.create_restaurant_prospect(payload)


@router.put("/{prospect_id}", response_model=RestaurantProspect)
def update_restaurant_prospect(
    prospect_id: str, payload: RestaurantProspectUpdate, request: Request
) -> RestaurantProspect:
    prospect = request.app.state.store.update_restaurant_prospect(prospect_id, payload)
    if not prospect:
        raise HTTPException(status_code=404, detail="Restaurant prospect not found")
    return prospect


@router.delete("/{prospect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restaurant_prospect(prospect_id: str, request: Request) -> Response:
    if not request.app.state.store.delete_restaurant_prospect(prospect_id):
        raise HTTPException(status_code=404, detail="Restaurant prospect not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
