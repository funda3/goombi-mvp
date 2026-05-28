from fastapi import APIRouter, HTTPException, Request, Response, status

from ..models import RestaurantProspect, RestaurantProspectCreate, RestaurantProspectUpdate


router = APIRouter(prefix="/api/restaurant-prospects", tags=["restaurant-prospects"])


@router.get("", response_model=list[RestaurantProspect])
def get_restaurant_prospects(request: Request) -> list[RestaurantProspect]:
    return request.app.state.store.list_restaurant_prospects()


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
