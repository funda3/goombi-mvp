"""Safely import verified Gauteng workspaces from CSV into listings seed data.

Modes:
- --dry-run: validate and report only (no writes, no backups)
- --apply: validate, backup listings.json, then append validated records

Running with no mode fails safely with usage and no side effects.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent
CSV_PATH = DATA_DIR / "workspace_coordinate_manual_review.csv"
SEED_PATH = DATA_DIR / "listings.json"
ACCEPTED_SOURCES = {
    "official_provider_page",
    "google_maps_manual_review",
    "openstreetmap_manual_review",
    "provider_site_plus_maps_review",
}
ACCEPTED_CONFIDENCE = {"medium", "high"}
ACCEPTED_WORKSPACE_TYPES = {
    "coworking",
    "meeting_room",
    "boardroom",
    "serviced_office",
    "virtual_office",
    "innovation_hub",
}
IMPORT_BATCH = "GOOMBI_WORKSPACE_IMPORT_BATCH_1"


def parse_bool(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"true", "1", "yes", "y"}


def parse_float(value: str | None) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(str(value).strip())
    except ValueError:
        return None


def parse_int(value: str | None) -> int | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        return None


def is_slug_id(value: str | None) -> bool:
    candidate = (value or "").strip()
    if not candidate:
        return False
    if candidate.isdigit():
        return False
    return re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", candidate) is not None


def row_issues(row: dict[str, str], existing_ids: set[str], seen_ids: set[str]) -> list[str]:
    issues: list[str] = []

    row_id = (row.get("id") or "").strip()
    name = (row.get("name") or "").strip()
    provider = (row.get("provider") or "").strip()

    if len(name) < 2:
        issues.append("invalid_name")
    if not provider:
        issues.append("missing_provider")

    if not is_slug_id(row_id):
        issues.append("invalid_slug_id")
    if row_id in existing_ids or row_id in seen_ids:
        issues.append("duplicate_id")

    if not parse_bool(row.get("import_eligible")):
        issues.append("import_ineligible")

    if (row.get("status") or "").strip().lower() != "active":
        issues.append("status_not_active")

    if (row.get("geocode_status") or "").strip().lower() != "verified":
        issues.append("geocode_not_verified")

    lat = parse_float(row.get("latitude"))
    lon = parse_float(row.get("longitude"))
    if lat is None or lon is None:
        issues.append("missing_or_invalid_coordinates")

    if (row.get("coordinate_source") or "").strip() not in ACCEPTED_SOURCES:
        issues.append("invalid_coordinate_source")

    if not (row.get("coordinate_verified_at") or "").strip():
        issues.append("missing_coordinate_verified_at")

    confidence = (row.get("coordinate_confidence") or "").strip().lower()
    if confidence not in ACCEPTED_CONFIDENCE:
        issues.append("invalid_coordinate_confidence")

    if not (row.get("coordinate_review_notes") or "").strip():
        issues.append("missing_coordinate_review_notes")

    workspace_type = (row.get("workspace_type") or "").strip()
    if workspace_type not in ACCEPTED_WORKSPACE_TYPES:
        issues.append("invalid_workspace_type")

    return issues


def build_listing(row: dict[str, str]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    provider = row.get("provider", "").strip()
    name = row.get("name", "").strip()
    source_url = (row.get("website_url") or "").strip() or (row.get("booking_url") or "").strip() or "import://workspace_coordinate_manual_review.csv"
    opening_year = parse_int(row.get("opening_year"))
    return {
        "id": row.get("id", "").strip(),
        "name": name,
        "category": "workspace",
        "listing_type": "workspace",
        "workspace_type": row.get("workspace_type", "serviced_office").strip() or "serviced_office",
        "provider": provider,
        "provider_name": provider,
        "status": "active",
        "opening_year": opening_year,
        "region": "Gauteng",
        "province": row.get("province", "Gauteng").strip() or "Gauteng",
        "city": row.get("city", "").strip(),
        "suburb": row.get("suburb", "").strip(),
        "address": row.get("address", "").strip(),
        "latitude": parse_float(row.get("latitude")),
        "longitude": parse_float(row.get("longitude")),
        "price_per_night": 0,
        "max_guests": 1,
        "rooms": 1,
        "capacity": None,
        "verified_status": True,
        "description": f"Verified-coordinate Goombi workspace candidate for {name}.",
        "amenities": [],
        "photos": [],
        "tags": ["workspace", "gauteng", "coordinate_verified"],
        "booking_url": "",
        "website_url": source_url if source_url.startswith("http") else "",
        "owner_name": "",
        "owner_phone": "",
        "pricing_status": "not_publicly_available",
        "source_url": source_url,
        "source_type": "verified_workspace_import",
        "import_batch": IMPORT_BATCH,
        "source_note": "Imported from manually verified Gauteng workspace coordinate review CSV.",
        "coordinate_source": row.get("coordinate_source", "").strip(),
        "coordinate_verified_at": row.get("coordinate_verified_at", "").strip(),
        "coordinate_confidence": row.get("coordinate_confidence", "").strip().lower(),
        "coordinate_review_notes": row.get("coordinate_review_notes", "").strip(),
        "coordinate_verified": True,
        "created_at": now,
        "updated_at": now,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import verified Gauteng workspace rows from CSV into listings seed.",
    )
    parser.add_argument("--csv-path", default=str(CSV_PATH), help="Path to workspace verification CSV")
    parser.add_argument("--seed-path", default=str(SEED_PATH), help="Path to listings.json seed file")
    parser.add_argument("--backup-dir", default=str(DATA_DIR), help="Directory for backup files when --apply is used")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report only; no writes")
    parser.add_argument("--apply", action="store_true", help="Apply import after validation and create backup")
    args = parser.parse_args(argv)

    if args.dry_run and args.apply:
        parser.error("Choose only one mode: --dry-run or --apply")
    if not args.dry_run and not args.apply:
        parser.error("No mode specified. Use --dry-run or --apply")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    csv_path = Path(args.csv_path)
    seed_path = Path(args.seed_path)
    backup_dir = Path(args.backup_dir)

    if not csv_path.exists():
        raise SystemExit(f"Missing CSV file: {csv_path}")
    if not seed_path.exists():
        raise SystemExit(f"Missing seed file: {seed_path}")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    with seed_path.open("r", encoding="utf-8-sig") as handle:
        listings = json.load(handle)

    existing_ids = {str(item.get("id")) for item in listings}
    seen_ids: set[str] = set()
    new_records = []
    skipped = 0
    blocked_by_reason: dict[str, int] = {}

    for row in sorted(rows, key=lambda item: (item.get("id") or "")):
        issues = row_issues(row, existing_ids, seen_ids)
        if issues:
            skipped += 1
            for issue in issues:
                blocked_by_reason[issue] = blocked_by_reason.get(issue, 0) + 1
            continue

        listing = build_listing(row)
        new_records.append(listing)
        row_id = (row.get("id") or "").strip()
        existing_ids.add(row_id)
        seen_ids.add(row_id)

    imported = len(new_records)

    if args.apply and new_records:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"seed_data_backup_{timestamp}.json"
        shutil.copy2(seed_path, backup_path)
        listings.extend(new_records)
        with seed_path.open("w", encoding="utf-8") as handle:
            json.dump(listings, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        print(f"Mode: APPLY")
        print(f"Backup created: {backup_path}")
        print(f"Seed updated: {seed_path}")
    elif args.apply:
        print("Mode: APPLY")
        print("No eligible rows to import. No backup created.")
    else:
        print("Mode: DRY-RUN")
        print("No files were modified.")

    print(f"CSV rows: {len(rows)}")
    print(f"Imported records: {imported}")
    print(f"Skipped records: {skipped}")
    if blocked_by_reason:
        print("Blocked reasons:")
        for reason in sorted(blocked_by_reason):
            print(f"- {reason}: {blocked_by_reason[reason]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


