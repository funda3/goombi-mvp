"""
goombi/config.py
----------------
Central config. Set your Neon DATABASE_URL in a .env file:

    DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/goombi?sslmode=require
    GOOGLE_PLACES_API_KEY=AIza...   (optional - for enrichment phase)

Never commit .env to version control.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Scraper behavior
REQUEST_DELAY_SEC = 2.5
REQUEST_TIMEOUT_SEC = 20
MAX_RETRIES = 3
RETRY_BACKOFF_SEC = 5

# How many consecutive empty pages before stopping pagination
EMPTY_PAGE_THRESHOLD = 2

# TripAdvisor URL patterns
TA_BASE = "https://www.tripadvisor.co.za"

TA_PROVINCES = {
    "gauteng": {
        "geo_id": "g312568",
        "name": "Gauteng",
        "url_prefix": "/Restaurants-g312568",
    },
    "western_cape": {
        "geo_id": "g312653",
        "name": "Western Cape",
        "url_prefix": "/Restaurants-g312653",
    },
    "kwazulu_natal": {
        "geo_id": "g312559",
        "name": "KwaZulu-Natal",
        "url_prefix": "/Restaurants-g312559",
    },
}

# TA uses offset-30 pagination: oa0, oa30, oa60, ...
TA_PAGE_SIZE = 30

# Category mapping
CUISINE_TO_CATEGORY = {
    "Bars & Pubs": "bar",
    "Bar": "bar",
    "Brew Pub": "brewery",
    "Wine Bar": "bar",
    "Nightclub": "club",
}

# Scraped headers to mimic a real browser
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
