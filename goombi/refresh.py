"""
goombi/refresh.py
-----------------
Weekly refresh job for TripAdvisor ratings + review counts.

Run manually:
    python refresh.py --province gauteng
    python refresh.py --stale-days 14
"""

import argparse
import logging
import re
import time
from datetime import datetime, timedelta, timezone

import psycopg2.extras
import requests
from bs4 import BeautifulSoup

from config import HEADERS, REQUEST_DELAY_SEC, REQUEST_TIMEOUT_SEC
from db import get_conn, log_run_finish, log_run_start

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("goombi.refresh")


def fetch_ta_venue_signals(ta_url: str) -> dict:
    """Scrape one TA venue page and return updated TA signals."""
    try:
        resp = requests.get(ta_url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SEC)
        if resp.status_code != 200:
            return {}

        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(" ", strip=True)
        signals = {"ta_last_refreshed": datetime.now(timezone.utc).isoformat()}

        match = re.search(r"\b([45])[,.]([0-9])\s+of\s+5", text, re.I)
        if not match:
            match = re.search(r"\b([45])[,.]([0-9])\b", text)
        if match:
            signals["ta_rating"] = float(f"{match.group(1)}.{match.group(2)}")

        match = re.search(r"([\d,\s]+)\s+reviews?", text, re.I)
        if match:
            count_str = re.sub(r"[,\s]", "", match.group(1))
            try:
                signals["ta_review_count"] = int(count_str)
            except ValueError:
                pass

        if re.search(r"Travellers.?\s*Choice", text, re.I):
            signals["ta_travellers_choice"] = True
        if re.search(r"Best of the Best", text, re.I):
            signals["ta_best_of_best"] = True

        return signals

    except Exception as err:
        log.warning(f"Error fetching {ta_url}: {err}")
        return {}


def refresh_province(province: str, stale_days: int = 7, batch_size: int = 50) -> dict:
    """Refresh TA signals for stale venues in one province."""
    run_id = log_run_start("weekly_refresh", province)
    cutoff = datetime.now(timezone.utc) - timedelta(days=stale_days)

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, ta_url, ta_rating, ta_review_count
                FROM venues
                WHERE province = %s
                  AND is_active = TRUE
                  AND ta_url IS NOT NULL
                  AND (ta_last_refreshed IS NULL OR ta_last_refreshed < %s)
                ORDER BY ta_review_count DESC NULLS LAST
                LIMIT %s
                """,
                (province, cutoff, batch_size),
            )
            stale = cur.fetchall()

    log.info(f"Refreshing {len(stale)} stale venues in {province}")

    updated = errors = 0

    for row in stale:
        signals = fetch_ta_venue_signals(row["ta_url"])
        if not signals:
            errors += 1
            time.sleep(REQUEST_DELAY_SEC)
            continue

        if signals.get("ta_rating") and row.get("ta_rating"):
            delta = float(signals["ta_rating"]) - float(row["ta_rating"])
            if abs(delta) >= 0.1:
                log.info(f"  Rating change: {row['name']} {row['ta_rating']} -> {signals['ta_rating']}")

        try:
            set_parts = ", ".join(f"{k} = %s" for k in signals)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE venues SET {set_parts} WHERE id = %s",
                        list(signals.values()) + [str(row["id"])],
                    )
            updated += 1
        except Exception as err:
            log.error(f"  DB error for '{row['name']}': {err}")
            errors += 1

        time.sleep(REQUEST_DELAY_SEC)

    log_run_finish(
        run_id,
        pages=0,
        found=len(stale),
        updated=updated,
        errors=errors,
        notes=f"stale_days={stale_days}",
    )

    summary = {
        "province": province,
        "stale_found": len(stale),
        "updated": updated,
        "errors": errors,
    }
    log.info(f"  Done: {updated} updated | {errors} errors")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Goombi weekly TA refresh")
    parser.add_argument("--province", choices=["gauteng", "western_cape", "kwazulu_natal"])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--stale-days", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=50)
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
        refresh_province(prov, stale_days=args.stale_days, batch_size=args.batch_size)
        time.sleep(5)
