from fastapi import APIRouter, HTTPException, Query, Request

from ..models import Event, EventCategoryLiteral, EventRecurringTypeLiteral


router = APIRouter(prefix="/api/events", tags=["events"])


def store(request: Request):
    return request.app.state.store


@router.get("", response_model=list[Event])
def get_events(
    request: Request,
    province: str | None = Query(default=None),
    city: str | None = Query(default=None),
    category: EventCategoryLiteral | None = Query(default=None),
    recurring_type: EventRecurringTypeLiteral | None = Query(default=None),
) -> list[Event]:
    events = store(request).list_events()
    if province:
        events = [event for event in events if event.province == province]
    if city:
        city_lc = city.strip().lower()
        events = [event for event in events if event.city.lower() == city_lc]
    if category:
        events = [event for event in events if event.category == category]
    if recurring_type:
        events = [event for event in events if event.recurring_type == recurring_type]
    return events


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: str, request: Request) -> Event:
    event = store(request).get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
