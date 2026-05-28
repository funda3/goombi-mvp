import math
from typing import Any

import httpx
from fastapi import APIRouter, Query

from ..models import NearbyServiceGroup, NearbyServiceItem, NearbyServicesResponse, ServiceCategoryLiteral


router = APIRouter(prefix="/api/nearby-services", tags=["nearby-services"])


class _ServiceDef:
    def __init__(self, emoji: str, label: str, filters: list[dict[str, str]]):
        self.emoji = emoji
        self.label = label
        self.filters = filters


_SERVICE_DEFS: dict[ServiceCategoryLiteral, _ServiceDef] = {
    "gym": _ServiceDef("🏋️", "Gym / Fitness", [{"amenity": "gym"}, {"leisure": "fitness_centre"}]),
    "shopping": _ServiceDef("🛒", "Shopping Centre", [{"shop": "mall"}, {"shop": "department_store"}]),
    "fuel": _ServiceDef("⛽", "Fuel Station", [{"amenity": "fuel"}]),
    "hospital": _ServiceDef("🏥", "Hospital", [{"amenity": "hospital"}]),
    "clinic": _ServiceDef("💊", "Clinic / Doctor", [{"amenity": "clinic"}, {"amenity": "doctors"}]),
    "police": _ServiceDef("👮", "Police Station", [{"amenity": "police"}]),
    "restaurant": _ServiceDef("🍽️", "Restaurant / Cafe", [{"amenity": "restaurant"}, {"amenity": "cafe"}]),
    "atm": _ServiceDef("🏧", "ATM / Bank", [{"amenity": "atm"}, {"amenity": "bank"}]),
    "supermarket": _ServiceDef("🛍️", "Supermarket", [{"shop": "supermarket"}]),
    "pharmacy": _ServiceDef("💊", "Pharmacy", [{"amenity": "pharmacy"}]),
    "transit": _ServiceDef("🚉", "Transit Stop", [{"railway": "station"}, {"public_transport": "stop_position"}, {"highway": "bus_stop"}]),
    "ev_charging": _ServiceDef("⚡", "EV Charging", [{"amenity": "charging_station"}]),
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return radius * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _build_query(lat: float, lon: float, radius_m: int) -> str:
    lines: list[str] = []
    for category, definition in _SERVICE_DEFS.items():
        scoped_radius = 10000 if category == "restaurant" else radius_m
        around = f"around:{scoped_radius},{lat},{lon}"
        for item in definition.filters:
            tags = "".join(f"[\"{k}\"=\"{v}\"]" for k, v in item.items())
            lines.append(f"  node{tags}({around});")
            lines.append(f"  way{tags}({around});")
    return "[out:json][timeout:25];\n(\n" + "\n".join(lines) + "\n);\nout center;"


def _coords_from_element(element: dict[str, Any]) -> tuple[float, float] | None:
    if element.get("type") == "node" and element.get("lat") is not None and element.get("lon") is not None:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center")
    if isinstance(center, dict) and center.get("lat") is not None and center.get("lon") is not None:
        return float(center["lat"]), float(center["lon"])
    return None


def _classify(tags: dict[str, str]) -> ServiceCategoryLiteral | None:
    for category, definition in _SERVICE_DEFS.items():
        for item in definition.filters:
            if all(tags.get(key) == value for key, value in item.items()):
                return category
    return None


@router.get("", response_model=NearbyServicesResponse)
def get_nearby_services(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_m: int = Query(default=5000, ge=500, le=15000),
) -> NearbyServicesResponse:
    try:
        query = _build_query(lat, lon, radius_m)
        response = httpx.post(
            "https://overpass-api.de/api/interpreter",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={"data": query},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        elements = payload.get("elements")
        if not isinstance(elements, list):
            raise ValueError("Malformed Overpass payload")

        buckets: dict[ServiceCategoryLiteral, list[NearbyServiceItem]] = {k: [] for k in _SERVICE_DEFS}
        for element in elements:
            if not isinstance(element, dict):
                continue
            tags = element.get("tags")
            if not isinstance(tags, dict):
                continue
            category = _classify(tags)
            if category is None:
                continue
            coords = _coords_from_element(element)
            if coords is None:
                continue
            service = NearbyServiceItem(
                id=int(element.get("id", 0)),
                name=str(tags.get("name") or _SERVICE_DEFS[category].label),
                lat=coords[0],
                lon=coords[1],
                distanceKm=_haversine_km(lat, lon, coords[0], coords[1]),
            )
            buckets[category].append(service)

        groups: list[NearbyServiceGroup] = []
        for category, definition in _SERVICE_DEFS.items():
            nearest = None
            if buckets[category]:
                nearest = min(buckets[category], key=lambda item: item.distanceKm)
            groups.append(
                NearbyServiceGroup(
                    category=category,
                    emoji=definition.emoji,
                    label=definition.label,
                    nearest=nearest,
                )
            )

        return NearbyServicesResponse(status="ok", services=groups)
    except Exception:
        # Demo-safe fallback: no crash and no raw fetch error propagation.
        return NearbyServicesResponse(status="fallback", services=[])
