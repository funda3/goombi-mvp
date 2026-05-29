"""
goombi/enrich_google.py
-----------------------
Google Places API enrichment layer.
Adds: operating hours, phone, website, Google rating, Google Maps URL,
      precise lat/lng, and (optionally) a photo URL.

Usage:
    python enrich_google.py --province gauteng --limit 100
    python enrich_google.py --all
"""

import argparse
import logging
import time
from datetime import datetime, timezone

import psycopg2.extras
import requests

from config import REQUEST_DELAY_SEC
from db import compute_quality_score, get_conn

GOOGLE_PLACES_API_KEY = __import__("os").getenv("GOOGLE_PLACES_API_KEY", "")

PLACES_FIND_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"
PLACES_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("goombi.enrich")


def find_place_id(name: str, lat: float, lng: float) -> str | None:
    """Find Google Place ID by venue name + lat/lng context."""
    if not GOOGLE_PLACES_API_KEY:
        log.warning("GOOGLE_PLACES_API_KEY not set - skipping enrichment")
        return None

    resp = requests.get(
        PLACES_FIND_URL,
        params={
            "input": name,
            "inputtype": "textquery",
            "locationbias": f"circle:500@{lat},{lng}",
            "fields": "place_id",
            "key": GOOGLE_PLACES_API_KEY,
        },
        timeout=10,
    )

    data = resp.json()
    candidates = data.get("candidates", [])
    if candidates:
        return candidates[0].get("place_id")
    return None


def get_place_details(place_id: str) -> dict:
    """Fetch full Place Details for a place_id."""
    resp = requests.get(
        PLACES_DETAIL_URL,
        params={
            "place_id": place_id,
            "fields": (
                "name,formatted_address,formatted_phone_number,"
                "geometry,opening_hours,rating,user_ratings_total,"
                "website,url,photos,price_level"
            ),
            "key": GOOGLE_PLACES_API_KEY,
        },
        timeout=10,
    )

    result = resp.json().get("result", {})
    if not result:
        return {}

    enriched = {
        "google_place_id": place_id,
        "google_last_refreshed": datetime.now(timezone.utc).isoformat(),
    }

    if result.get("rating"):
        enriched["google_rating"] = float(result["rating"])
    if result.get("user_ratings_total"):
        enriched["google_review_count"] = int(result["user_ratings_total"])
    if result.get("formatted_phone_number"):
        enriched["phone"] = result["formatted_phone_number"]
    if result.get("website"):
        enriched["website"] = result["website"]
    if result.get("url"):
        enriched["google_maps_url"] = result["url"]
    if result.get("formatted_address"):
        enriched["address"] = result["formatted_address"]

    geo = result.get("geometry", {}).get("location", {})
    if geo.get("lat") and geo.get("lng"):
        enriched["lat"] = float(geo["lat"])
        enriched["lng"] = float(geo["lng"])

    hours_data = result.get("opening_hours", {})
    if hours_data.get("weekday_text"):
        hours = {}
        day_map = {
            "Monday": "mon", "Tuesday": "tue", "Wednesday": "wed",
            "Thursday": "thu", "Friday": "fri", "Saturday": "sat", "Sunday": "sun",
        }
        for entry in hours_data["weekday_text"]:
            parts = entry.split(": ", 1)
            if len(parts) == 2:
                day_key = day_map.get(parts[0], parts[0].lower()[:3])
                hours[day_key] = parts[1].strip()
        if hours:
            enriched["operating_hours"] = __import__("json").dumps(hours)

    photos = result.get("photos", [])
    if photos and GOOGLE_PLACES_API_KEY:
        photo_ref = photos[0].get("photo_reference")
        if photo_ref:
            enriched["hero_image_url"] = (
                f"{PLACES_PHOTO_URL}?maxwidth=800"
                f"&photoreference={photo_ref}&key={GOOGLE_PLACES_API_KEY}"
            )

    return enriched


def enrich_province(province: str, limit: int = 500) -> dict:
    """Enrich venues in a province that do not yet have Google data."""
    if not GOOGLE_PLACES_API_KEY:
        log.error("GOOGLE_PLACES_API_KEY not set in .env - cannot enrich")
        return {}

    log.info(f"Enriching {province} (limit={limit}) ...")
    enriched_count = error_count = skipped_count = 0

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, lat, lng, suburb, city, google_place_id
                FROM venues
                WHERE province = %s
                  AND google_last_refreshed IS NULL
                  AND is_active = TRUE
                ORDER BY ta_review_count DESC NULLS LAST
                LIMIT %s
                """,
                (province, limit),
            )
            rows = cur.fetchall()

    log.info(f"  {len(rows)} venues need enrichment")

    for row in rows:
        name = row["name"]
        lat = row.get("lat")
        lng = row.get("lng")

        if not lat or not lng:
            log.debug(f"  Skipping '{name}' - no coordinates")
            skipped_count += 1
            continue

        try:
            place_id = row.get("google_place_id") or find_place_id(name, lat, lng)
            if not place_id:
                log.debug(f"  No Google place found for '{name}'")
                skipped_count += 1
                time.sleep(REQUEST_DELAY_SEC)
                continue

            details = get_place_details(place_id)
            if not details:
                skipped_count += 1
                time.sleep(REQUEST_DELAY_SEC)
                continue

            merged = {**dict(row), **details}
            details["data_quality_score"] = compute_quality_score(merged)

            set_parts = ", ".join(f"{k} = %s" for k in details)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE venues SET {set_parts} WHERE id = %s",
                        list(details.values()) + [str(row["id"])],
                    )

            log.info(f"  Enriched: {name}")
            enriched_count += 1

        except Exception as err:
            log.error(f"  Error enriching '{name}': {err}")
            error_count += 1

        time.sleep(REQUEST_DELAY_SEC)

    summary = {
        "province": province,
        "enriched": enriched_count,
        "skipped": skipped_count,
        "errors": error_count,
    }
    log.info(f"  Done: {enriched_count} enriched | {skipped_count} skipped | {error_count} errors")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Goombi Google Places enrichment")
    parser.add_argument("--province", choices=["gauteng", "western_cape", "kwazulu_natal"])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int, default=200, help="Max venues per province")
    args = parser.parse_args()

    provinces = (
        ["gauteng", "western_cape", "kwazulu_natal"] if args.all
        else [args.province] if args.province
        else []
    )

    if not provinces:
        parser.print_help()
        raise SystemExit(1)

    for prov in provinces:
        enrich_province(prov, limit=args.limit)
