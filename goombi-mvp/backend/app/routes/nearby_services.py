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
    "workspace": _ServiceDef("💼", "Workspace", [{"office": "coworking"}, {"amenity": "coworking_space"}]),
    "attraction": _ServiceDef("🎟️", "Event / Attraction", [{"tourism": "attraction"}, {"tourism": "museum"}, {"leisure": "park"}]),
    "parking": _ServiceDef("🅿️", "Parking / Access", [{"amenity": "parking"}]),
}

_PROVINCE_CENTERS: dict[str, tuple[float, float]] = {
    "gauteng": (-26.2041, 28.0473),
    "western cape": (-33.9249, 18.4241),
    "kwa-zulu natal": (-29.8587, 31.0218),
    "kwazulu-natal": (-29.8587, 31.0218),
    "kzn": (-29.8587, 31.0218),
}

_FALLBACK_BASE: dict[str, list[ServiceCategoryLiteral]] = {
    "gauteng": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
    "kwa-zulu natal": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
    "kwazulu-natal": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
    "western cape": ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"],
}

_FALLBACK_NAMES: dict[ServiceCategoryLiteral, str] = {
    "restaurant": "Estimated café / food option",
    "fuel": "Estimated fuel / transport service",
    "supermarket": "Estimated retail / convenience option",
    "shopping": "Estimated retail / convenience option",
    "pharmacy": "Estimated pharmacy / health service",
    "clinic": "Estimated pharmacy / health service",
    "hospital": "Estimated pharmacy / health service",
    "parking": "Estimated parking / access point",
    "transit": "Estimated parking / access point",
    "workspace": "Estimated accommodation support option",
    "atm": "Estimated retail / convenience option",
    "police": "Estimated accommodation support option",
    "gym": "Estimated accommodation support option",
    "ev_charging": "Estimated fuel / transport service",
    "attraction": "Estimated retail / convenience option",
}

_FALLBACK_REASON = "External nearby service provider unavailable"


def _normalize_location_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _stable_seed(*parts: str | None) -> int:
    text = "|".join(_normalize_location_text(part) for part in parts if part)
    if not text:
        return 17
    return sum((idx + 1) * ord(ch) for idx, ch in enumerate(text))


def _fallback_base_coords(
    lat: float | None,
    lon: float | None,
    province: str | None,
) -> tuple[float, float] | None:
    if lat is not None and lon is not None:
        return lat, lon
    province_key = _normalize_location_text(province)
    if province_key in _PROVINCE_CENTERS:
        return _PROVINCE_CENTERS[province_key]
    return None


def _offset_coords(lat: float, lon: float, distance_km: float, bearing_deg: float) -> tuple[float, float]:
    bearing = math.radians(bearing_deg)
    lat_delta = (distance_km / 111.0) * math.cos(bearing)
    lon_scale = max(0.2, math.cos(math.radians(lat)))
    lon_delta = (distance_km / (111.0 * lon_scale)) * math.sin(bearing)
    return lat + lat_delta, lon + lon_delta


def _fallback_categories(province: str | None) -> list[ServiceCategoryLiteral]:
    province_key = _normalize_location_text(province)
    if province_key in _FALLBACK_BASE:
        return _FALLBACK_BASE[province_key]
    return ["restaurant", "fuel", "supermarket", "pharmacy", "parking", "transit"]


def _build_fallback_groups(
    lat: float | None,
    lon: float | None,
    province: str | None,
    city: str | None,
    suburb: str | None,
) -> list[NearbyServiceGroup]:
    base_coords = _fallback_base_coords(lat, lon, province)
    if base_coords is None:
        return []

    seed = _stable_seed(suburb, city, province, str(lat) if lat is not None else None, str(lon) if lon is not None else None)
    categories = _fallback_categories(province)
    count = 4 + (seed % 5)  # 4..8 demo cards
    chosen = categories[:count] if len(categories) >= count else (categories * ((count // len(categories)) + 1))[:count]
    distances = [0.9, 1.2, 1.6, 2.1, 2.8, 3.4, 4.2, 5.1]

    groups: list[NearbyServiceGroup] = []
    for index, category in enumerate(chosen):
        definition = _SERVICE_DEFS[category]
        distance = round(distances[(seed + index) % len(distances)], 2)
        bearing = float((seed + (index * 47)) % 360)
        item_lat, item_lon = _offset_coords(base_coords[0], base_coords[1], distance, bearing)
        nearest = NearbyServiceItem(
            id=seed * 100 + index + 1,
            name=_FALLBACK_NAMES[category],
            lat=round(item_lat, 6),
            lon=round(item_lon, 6),
            distanceKm=distance,
            source="fallback",
            isFallback=True,
            badgeLabel="Fallback estimate",
            reason=_FALLBACK_REASON,
        )
        groups.append(
            NearbyServiceGroup(
                category=category,
                emoji=definition.emoji,
                label=definition.label,
                nearest=nearest,
            )
        )
    return groups


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
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    province: str | None = Query(default=None),
    city: str | None = Query(default=None),
    suburb: str | None = Query(default=None),
    radius_m: int = Query(default=5000, ge=500, le=15000),
) -> NearbyServicesResponse:
    lng_value = lng if lng is not None else lon
    if lat is None or lng_value is None:
        return NearbyServicesResponse(
            status="empty",
            message="Nearby services require listing coordinates.",
            services=[],
        )

    try:
        query = _build_query(lat, lng_value, radius_m)
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
                distanceKm=_haversine_km(lat, lng_value, coords[0], coords[1]),
                source="external",
                isFallback=False,
                badgeLabel="Live result",
                reason=None,
            )
            buckets[category].append(service)

        groups: list[NearbyServiceGroup] = []
        has_live_results = False
        for category, definition in _SERVICE_DEFS.items():
            nearest = None
            if buckets[category]:
                nearest = min(buckets[category], key=lambda item: item.distanceKm)
                has_live_results = True
            groups.append(
                NearbyServiceGroup(
                    category=category,
                    emoji=definition.emoji,
                    label=definition.label,
                    nearest=nearest,
                )
            )

        if has_live_results:
            return NearbyServicesResponse(
                status="live",
                message="Live nearby services",
                services=groups,
            )

        fallback = _build_fallback_groups(lat, lng_value, province, city, suburb)
        if fallback:
            return NearbyServicesResponse(
                status="fallback",
                message="Demo nearby services shown",
                services=fallback,
            )
        return NearbyServicesResponse(
            status="empty",
            message="Nearby services unavailable.",
            services=[],
        )
    except Exception:
        fallback = _build_fallback_groups(lat, lng_value, province, city, suburb)
        if fallback:
            return NearbyServicesResponse(
                status="fallback",
                message="Demo nearby services shown",
                services=fallback,
            )
        return NearbyServicesResponse(
            status="empty",
            message="Nearby services unavailable.",
            services=[],
        )
