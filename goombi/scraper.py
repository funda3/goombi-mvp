"""
goombi/scraper.py
-----------------
TripAdvisor scraper for SA restaurant listings.

Scrapes:
  1. Province listing pages -> skeleton rows (name, rating, suburb, cuisine, price)
  2. Individual venue pages -> deeper data (address, lat/lng, ta_location_id from URL)

Usage:
    python scraper.py --province gauteng
    python scraper.py --province western_cape
    python scraper.py --province kwazulu_natal
    python scraper.py --all
"""

import argparse
import logging
import re
import time
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup

from config import (
    CUISINE_TO_CATEGORY,
    EMPTY_PAGE_THRESHOLD,
    HEADERS,
    MAX_RETRIES,
    REQUEST_DELAY_SEC,
    REQUEST_TIMEOUT_SEC,
    RETRY_BACKOFF_SEC,
    TA_BASE,
    TA_PAGE_SIZE,
    TA_PROVINCES,
)
from db import compute_quality_score, log_run_finish, log_run_start, upsert_venue

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("goombi.scraper")


def fetch(url: str, retries: int = MAX_RETRIES) -> Optional[BeautifulSoup]:
    """Fetch a URL with retry + backoff. Returns BeautifulSoup or None."""
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SEC)
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, "html.parser")
            if resp.status_code == 429:
                wait = RETRY_BACKOFF_SEC * attempt * 2
                log.warning(f"Rate limited - waiting {wait}s (attempt {attempt})")
                time.sleep(wait)
            elif resp.status_code == 403:
                log.warning(f"403 Forbidden on {url} - skipping")
                return None
            else:
                log.warning(f"HTTP {resp.status_code} on {url} (attempt {attempt})")
                time.sleep(RETRY_BACKOFF_SEC)
        except requests.RequestException as err:
            log.warning(f"Request error: {err} (attempt {attempt})")
            time.sleep(RETRY_BACKOFF_SEC * attempt)
    log.error(f"Failed after {retries} attempts: {url}")
    return None


def page_url(province_key: str, offset: int) -> str:
    """Build the paginated listing URL for a province."""
    prov = TA_PROVINCES[province_key]
    name_seg = prov["name"].replace(" ", "_")
    prefix = prov["url_prefix"]

    if offset == 0:
        return f"{TA_BASE}{prefix}-{name_seg}.html"
    return f"{TA_BASE}{prefix}-oa{offset}-{name_seg}.html"


def parse_listing_page(soup: BeautifulSoup, province_key: str) -> list[dict]:
    """Parse one TA listing page into partial venue dicts."""
    province_info = TA_PROVINCES[province_key]
    venues: list[dict] = []

    links = soup.find_all("a", href=re.compile(r"/Restaurant_Review-"))

    seen_hrefs = set()
    for link in links:
        href = link.get("href", "")
        if href in seen_hrefs:
            continue
        seen_hrefs.add(href)

        match = re.search(r"-d(\d+)-", href)
        if not match:
            continue
        ta_location_id = int(match.group(1))

        name_el = link.find(["span", "div", "h3", "h2"])
        name = name_el.get_text(strip=True) if name_el else link.get_text(strip=True)
        name = clean_text(name)
        if not name or len(name) < 2:
            continue

        card = link.find_parent(["div", "li"], class_=re.compile(r"(listing|result|card)", re.I))
        if card is None:
            card = link.find_parent("div")

        venue = {
            "name": name,
            "ta_location_id": ta_location_id,
            "ta_url": TA_BASE + href.split("?")[0],
            "province": province_key,
            "city": province_info["name"].replace(" ", "_").lower(),
            "category": "restaurant",
            "ta_last_refreshed": datetime.now(timezone.utc).isoformat(),
        }

        if card:
            venue.update(parse_card_details(card))

        venue["data_quality_score"] = compute_quality_score(venue)
        venues.append(venue)

    return venues


def parse_card_details(card) -> dict:
    """Extract rating, reviews, price, cuisine, suburb from a venue card."""
    data: dict = {}
    card_text = card.get_text(" ", strip=True)

    rating_match = re.search(r"\b([45])[,.]([0-9])\b", card_text)
    if rating_match:
        data["ta_rating"] = float(f"{rating_match.group(1)}.{rating_match.group(2)}")

    review_match = re.search(r"\(([0-9 ,]+)\s*(?:reviews?)?\)", card_text)
    if review_match:
        count_str = re.sub(r"[ ,]", "", review_match.group(1))
        try:
            data["ta_review_count"] = int(count_str)
        except ValueError:
            pass

    price_match = re.search(r"\b(RRRR|RR\s*-\s*RRR|RRR|RR|R)\b", card_text)
    if price_match:
        data["ta_price_level"] = price_match.group(1).replace(" ", "")

    cuisine_pattern = (
        r"(Steakhouse|Seafood|Italian|Indian|Chinese|Japanese|Asian|"
        r"Mediterranean|European|American|African|French|Portuguese|"
        r"International|Contemporary|Bar|Bars & Pubs|Brew Pub|"
        r"Fusion|Cafe|Bakery|Healthy|Pizza|Sushi|"
        r"Turkish|Korean|Greek|Spanish|Thai|Vietnamese|"
        r"Neapolitan|Romagna|Cajun|Ethiopian|Tunisian|"
        r"Wine Bar|Dining bars|Grill|Barbecue|Barbeque|"
        r"Sandwiches|Vegetarian Friendly|Vegan Options)"
    )
    cuisines = re.findall(cuisine_pattern, card_text)
    if cuisines:
        data["ta_cuisine_tags"] = list(dict.fromkeys(cuisines))
        for cuisine in cuisines:
            if cuisine in CUISINE_TO_CATEGORY:
                data["category"] = CUISINE_TO_CATEGORY[cuisine]
                break

    suburb_match = re.search(
        r"\b(Sandton|Rosebank|Johannesburg|Pretoria|Midrand|Centurion|"
        r"Soweto|Bryanston|Fourways|Kempton Park|Bedfordview|"
        r"Roodepoort|Randburg|Alberton|Vanderbijlpark|Krugersdorp|"
        r"Magaliesburg|Muldersdrift|Boksburg|Edenvale|"
        r"Cape Town|Camps Bay|Constantia|Stellenbosch|Franschhoek|"
        r"Hermanus|Knysna|Plettenberg Bay|George|Paternoster|"
        r"Wilderness|Sea Point|Simon's Town|Bloubergstrand|"
        r"Hout Bay|Somerset West|Langebaan|Onrus|Century City|"
        r"Durban|Umhlanga|Ballito|Pietermaritzburg|"
        r"Port Elizabeth|East London|Bloemfontein)\b",
        card_text,
    )
    if suburb_match:
        data["suburb"] = suburb_match.group(1)

    if re.search(r"Travellers.?\s*Choice", card_text, re.I):
        data["ta_travellers_choice"] = True
    if re.search(r"Best of the Best", card_text, re.I):
        data["ta_best_of_best"] = True

    return data


def parse_venue_page(url: str, venue: dict) -> dict:
    """Scrape a TA venue page for richer fields."""
    soup = fetch(url)
    if not soup:
        return venue

    page_text = soup.get_text(" ", strip=True)

    addr_el = soup.find("span", class_=re.compile(r"(address|street|location)", re.I))
    if addr_el:
        venue["address"] = clean_text(addr_el.get_text())

    import json

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                addr = data.get("address", {})
                if isinstance(addr, dict):
                    parts = [
                        addr.get("streetAddress", ""),
                        addr.get("addressLocality", ""),
                        addr.get("addressRegion", ""),
                        addr.get("postalCode", ""),
                    ]
                    full_addr = ", ".join(part for part in parts if part)
                    if full_addr:
                        venue["address"] = full_addr

                geo = data.get("geo", {})
                if geo.get("latitude") and geo.get("longitude"):
                    venue["lat"] = float(geo["latitude"])
                    venue["lng"] = float(geo["longitude"])

                if data.get("telephone"):
                    venue["phone"] = data["telephone"]

                if data.get("url") and "tripadvisor" not in data["url"].lower():
                    venue["website"] = data["url"]

                if data.get("servesCuisine"):
                    cuisine_value = data["servesCuisine"]
                    if isinstance(cuisine_value, list):
                        venue["ta_cuisine_tags"] = cuisine_value
                    elif isinstance(cuisine_value, str):
                        venue["ta_cuisine_tags"] = [cuisine_value]

                if data.get("priceRange"):
                    venue["ta_price_level"] = data["priceRange"]

        except (json.JSONDecodeError, TypeError, AttributeError):
            pass

    if not venue.get("lat"):
        lat_match = re.search(r'"latitude"\s*:\s*([-\d.]+)', page_text)
        lng_match = re.search(r'"longitude"\s*:\s*([-\d.]+)', page_text)
        if lat_match and lng_match:
            venue["lat"] = float(lat_match.group(1))
            venue["lng"] = float(lng_match.group(1))

    photos: list[str] = []
    for img in soup.find_all("img", src=re.compile(r"dynamic-media-cdn\.tripadvisor\.com")):
        src = img.get("src", "")
        src = re.sub(r"w=\d+", "w=550", src)
        src = re.sub(r"h=\d+", "h=550", src)
        if src not in photos:
            photos.append(src)
        if len(photos) >= 5:
            break

    if photos:
        venue["hero_image_url"] = photos[0]
        venue["photo_urls"] = photos

    venue["data_quality_score"] = compute_quality_score(venue)
    return venue


def scrape_province(
    province_key: str,
    deep_scrape: bool = False,
    max_pages: Optional[int] = None,
) -> dict:
    """Full scrape of one province."""
    run_id = log_run_start("initial_load", province_key)
    prov = TA_PROVINCES[province_key]
    log.info(f"Starting scrape: {prov['name']}")

    total_found = total_inserted = total_updated = total_errors = 0
    pages_scraped = 0
    empty_count = 0
    offset = 0

    while True:
        if max_pages and pages_scraped >= max_pages:
            log.info(f"Reached max_pages={max_pages} - stopping.")
            break

        url = page_url(province_key, offset)
        log.info(f"  Page {pages_scraped + 1} | offset={offset} | {url}")

        soup = fetch(url)
        if not soup:
            total_errors += 1
            empty_count += 1
            if empty_count >= EMPTY_PAGE_THRESHOLD:
                log.warning("Too many failed pages - stopping.")
                break
            offset += TA_PAGE_SIZE
            continue

        venues_on_page = parse_listing_page(soup, province_key)
        pages_scraped += 1

        if not venues_on_page:
            empty_count += 1
            log.info(f"  -> No venues found on page {pages_scraped}")
            if empty_count >= EMPTY_PAGE_THRESHOLD:
                log.info("Reached empty page threshold - done.")
                break
        else:
            empty_count = 0
            total_found += len(venues_on_page)
            log.info(f"  -> {len(venues_on_page)} venues found")

            for venue in venues_on_page:
                try:
                    if deep_scrape and venue.get("ta_url"):
                        time.sleep(REQUEST_DELAY_SEC)
                        venue = parse_venue_page(venue["ta_url"], venue)

                    action = upsert_venue(venue)
                    if action == "inserted":
                        total_inserted += 1
                    elif action == "updated":
                        total_updated += 1
                except Exception as err:
                    log.error(f"  Error upserting '{venue.get('name')}': {err}")
                    total_errors += 1

        next_link = soup.find("a", href=re.compile(rf"oa{offset + TA_PAGE_SIZE}"))
        if not next_link and pages_scraped > 1:
            log.info("No next-page link found - end of results.")
            break

        offset += TA_PAGE_SIZE
        time.sleep(REQUEST_DELAY_SEC)

    summary = {
        "province": province_key,
        "pages": pages_scraped,
        "found": total_found,
        "inserted": total_inserted,
        "updated": total_updated,
        "errors": total_errors,
    }

    log_run_finish(
        run_id,
        pages=pages_scraped,
        found=total_found,
        inserted=total_inserted,
        updated=total_updated,
        errors=total_errors,
        notes=f"deep_scrape={deep_scrape}",
    )

    log.info(
        f"  Done: {total_found} found | {total_inserted} inserted | "
        f"{total_updated} updated | {total_errors} errors"
    )
    return summary


def clean_text(text: str) -> str:
    """Normalize whitespace and strip junk."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Goombi TripAdvisor scraper")
    parser.add_argument("--province", choices=list(TA_PROVINCES.keys()), help="Province to scrape")
    parser.add_argument("--all", action="store_true", help="Scrape all provinces")
    parser.add_argument("--deep", action="store_true", help="Also scrape individual venue pages")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit pages per province")
    parser.add_argument("--setup-schema", action="store_true", help="Apply schema.sql first")
    args = parser.parse_args()

    if args.setup_schema:
        from db import apply_schema

        apply_schema()

    provinces_to_run = (
        list(TA_PROVINCES.keys()) if args.all
        else [args.province] if args.province
        else []
    )

    if not provinces_to_run:
        parser.print_help()
        raise SystemExit(1)

    all_summaries = []
    for prov in provinces_to_run:
        summary = scrape_province(prov, deep_scrape=args.deep, max_pages=args.max_pages)
        all_summaries.append(summary)
        time.sleep(3)

    print("\nFINAL SUMMARY")
    for summary in all_summaries:
        print(
            f"  {summary['province']:20s}  pages={summary['pages']:4d}  "
            f"found={summary['found']:5d}  inserted={summary['inserted']:5d}  "
            f"updated={summary['updated']:4d}  errors={summary['errors']:3d}"
        )
