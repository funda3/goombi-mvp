"""
goombi/db.py
------------
Neon PostgreSQL connection pool + all write helpers.
"""

import re
import unicodedata
from contextlib import contextmanager
from typing import Optional

import psycopg2
import psycopg2.extras
from psycopg2 import pool

from config import DATABASE_URL


# Connection pool (min 1, max 5 connections)
_pool: Optional[pool.SimpleConnectionPool] = None


def get_pool() -> pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL not set. Add it to .env:\n"
                "  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/goombi?sslmode=require"
            )
        _pool = pool.SimpleConnectionPool(1, 5, DATABASE_URL)
    return _pool


@contextmanager
def get_conn():
    """Context manager: auto-returns connection to pool."""
    conn = get_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        get_pool().putconn(conn)


def apply_schema(schema_path: str = "schema.sql") -> None:
    """Run schema.sql against the database (idempotent and safe to re-run)."""
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    print("Schema applied.")


# Slug generation

def slugify(text: str) -> str:
    """'The Fat Butcher (Stellenbosch)' -> 'the-fat-butcher-stellenbosch'"""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = text.strip("-")
    return text


def unique_slug(base: str, existing: set) -> str:
    """Ensure slug is unique by appending -2, -3, ... if needed."""
    slug = slugify(base)
    candidate = slug
    n = 2
    while candidate in existing:
        candidate = f"{slug}-{n}"
        n += 1
    return candidate


# Venue upsert

def upsert_venue(venue: dict) -> str:
    """
    Insert or update a venue row. Returns 'inserted' or 'updated'.

    Required keys: name, province, city, category
    Optional keys: all others in the schema
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            if venue.get("ta_location_id"):
                cur.execute(
                    "SELECT id, goombi_slug FROM venues WHERE ta_location_id = %s",
                    (venue["ta_location_id"],),
                )
                existing = cur.fetchone()
            else:
                existing = None

            if existing:
                venue_id, slug = existing
                action = "updated"
            else:
                cur.execute("SELECT goombi_slug FROM venues")
                all_slugs = {r[0] for r in cur.fetchall()}
                base = f"{venue['name']}-{venue.get('suburb') or venue.get('city', '')}"
                slug = unique_slug(base, all_slugs)
                venue_id = None
                action = "inserted"

            venue["goombi_slug"] = slug

            allowed_cols = {
                "goombi_slug", "ta_location_id", "google_place_id",
                "name", "category", "subcategory", "province",
                "city", "suburb", "neighbourhood_tag",
                "address", "lat", "lng",
                "ta_rating", "ta_review_count", "ta_price_level",
                "ta_cuisine_tags", "ta_city_rank", "ta_province_rank",
                "ta_travellers_choice", "ta_best_of_best",
                "ta_url", "ta_last_refreshed",
                "google_rating", "google_review_count",
                "phone", "website", "google_maps_url", "google_last_refreshed",
                "zar_price_min", "zar_price_max", "operating_hours",
                "booking_url", "menu_url", "instagram_handle", "facebook_url",
                "vibe_tags", "music_genre", "dress_code",
                "cover_charge_zar", "age_restriction",
                "booking_required", "accepts_walkins",
                "hero_image_url", "photo_urls",
                "is_active", "is_verified", "is_featured",
                "data_quality_score", "notes",
            }

            data = {k: v for k, v in venue.items() if k in allowed_cols and v is not None}

            if action == "inserted":
                cols = ", ".join(data.keys())
                placeholders = ", ".join(["%s"] * len(data))
                sql = f"INSERT INTO venues ({cols}) VALUES ({placeholders})"
                cur.execute(sql, list(data.values()))
            else:
                update_fields = {
                    k: v for k, v in data.items()
                    if k not in {"goombi_slug", "province"}
                }
                if not update_fields:
                    return "skipped"
                set_clause = ", ".join(f"{k} = %s" for k in update_fields)
                sql = f"UPDATE venues SET {set_clause} WHERE ta_location_id = %s"
                cur.execute(sql, list(update_fields.values()) + [venue["ta_location_id"]])

            _ = venue_id
            return action


# Scrape run logging

def log_run_start(run_type: str, province: Optional[str] = None) -> str:
    """Start a scrape run log. Returns the run UUID."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO scrape_runs (run_type, province)
                   VALUES (%s, %s) RETURNING id""",
                (run_type, province),
            )
            return str(cur.fetchone()[0])


def log_run_finish(
    run_id: str,
    pages: int = 0,
    found: int = 0,
    inserted: int = 0,
    updated: int = 0,
    errors: int = 0,
    notes: str = "",
) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE scrape_runs
                   SET finished_at = NOW(),
                       pages_scraped = %s, venues_found = %s,
                       venues_inserted = %s, venues_updated = %s,
                       errors = %s, notes = %s
                   WHERE id = %s""",
                (pages, found, inserted, updated, errors, notes, run_id),
            )


# Quality score calculator

def compute_quality_score(venue: dict) -> int:
    """
    Score 0-100 based on field completeness.
    Run after upsert to keep scores fresh.
    """
    score = 0
    score += 10 if venue.get("name") else 0
    score += 10 if venue.get("address") else 0
    score += 10 if venue.get("lat") else 0
    score += 10 if venue.get("ta_rating") else 0
    score += 10 if venue.get("ta_review_count") else 0
    score += 15 if venue.get("operating_hours") else 0
    score += 5 if venue.get("phone") else 0
    score += 10 if venue.get("booking_url") else 0
    score += 5 if venue.get("menu_url") else 0
    score += 5 if venue.get("vibe_tags") else 0
    score += 10 if venue.get("hero_image_url") else 0
    return min(score, 100)
