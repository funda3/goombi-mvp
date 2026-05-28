from fastapi import APIRouter, HTTPException, Query, Request

from ..models import (
    NightlifeMusicFocusLiteral,
    NightlifeTierLiteral,
    NightlifeVenue,
    NightlifeVenueTypeLiteral,
)


router = APIRouter(prefix="/api/nightlife", tags=["nightlife"])


def store(request: Request):
    return request.app.state.store


@router.get("", response_model=list[NightlifeVenue])
def get_nightlife(
    request: Request,
    province: str | None = Query(default=None),
    city: str | None = Query(default=None),
    suburb: str | None = Query(default=None),
    nightlife_tier: NightlifeTierLiteral | None = Query(default=None),
    music_focus: NightlifeMusicFocusLiteral | None = Query(default=None),
    venue_type: NightlifeVenueTypeLiteral | None = Query(default=None),
) -> list[NightlifeVenue]:
    nightlife = store(request).list_nightlife()
    if province:
        nightlife = [venue for venue in nightlife if venue.province == province]
    if city:
        city_lc = city.strip().lower()
        nightlife = [venue for venue in nightlife if venue.city.lower() == city_lc]
    if suburb:
        suburb_lc = suburb.strip().lower()
        nightlife = [venue for venue in nightlife if venue.suburb.lower() == suburb_lc]
    if nightlife_tier:
        nightlife = [venue for venue in nightlife if venue.nightlife_tier == nightlife_tier]
    if music_focus:
        nightlife = [venue for venue in nightlife if music_focus in venue.music_focus]
    if venue_type:
        nightlife = [venue for venue in nightlife if venue.venue_type == venue_type]
    return nightlife


@router.get("/{venue_id}", response_model=NightlifeVenue)
def get_nightlife_venue(venue_id: str, request: Request) -> NightlifeVenue:
    venue = store(request).get_nightlife(venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Nightlife venue not found")
    return venue
