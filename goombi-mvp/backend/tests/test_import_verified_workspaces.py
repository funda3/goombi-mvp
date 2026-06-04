import csv
import importlib.util
import json
from pathlib import Path

import pytest


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "import_verified_workspaces.py"

CSV_FIELDNAMES = [
    "id",
    "provider",
    "name",
    "workspace_type",
    "status",
    "opening_year",
    "province",
    "city",
    "suburb",
    "address",
    "latitude",
    "longitude",
    "geocode_status",
    "coordinate_source",
    "coordinate_verified_at",
    "coordinate_confidence",
    "coordinate_review_notes",
    "import_eligible",
    "import_timestamp",
    "import_notes",
    "website_url",
    "booking_url",
]


def load_importer_module():
    spec = importlib.util.spec_from_file_location("import_verified_workspaces", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_seed(path: Path, records: list[dict]) -> None:
    path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        for row in rows:
            payload = {field: "" for field in CSV_FIELDNAMES}
            payload.update(row)
            writer.writerow(payload)


def make_valid_row(row_id: str) -> dict:
    return {
        "id": row_id,
        "provider": "Goombi Workspace Co",
        "name": f"Workspace {row_id}",
        "workspace_type": "coworking",
        "status": "active",
        "opening_year": "2020",
        "province": "Gauteng",
        "city": "Johannesburg",
        "suburb": "Rosebank",
        "address": "1 Test Street, Johannesburg",
        "latitude": "-26.1367",
        "longitude": "28.0383",
        "geocode_status": "verified",
        "coordinate_source": "google_maps_manual_review",
        "coordinate_verified_at": "2026-06-03T09:00:00Z",
        "coordinate_confidence": "high",
        "coordinate_review_notes": "Verified against provider site and maps.",
        "import_eligible": "true",
        "import_timestamp": "",
        "import_notes": "",
        "website_url": "https://example.com/workspace",
    }


def test_help_has_no_side_effects(tmp_path: Path) -> None:
    importer = load_importer_module()
    seed_path = tmp_path / "listings.json"
    csv_path = tmp_path / "workspace_coordinate_manual_review.csv"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    write_seed(seed_path, [{"id": "seed-1"}])
    write_csv(csv_path, [make_valid_row("workspace-help-check")])
    before_seed = seed_path.read_bytes()

    with pytest.raises(SystemExit) as exc:
        importer.main(
            [
                "--help",
                "--seed-path",
                str(seed_path),
                "--csv-path",
                str(csv_path),
                "--backup-dir",
                str(backup_dir),
            ]
        )

    assert exc.value.code == 0
    assert seed_path.read_bytes() == before_seed
    assert list(backup_dir.glob("seed_data_backup_*.json")) == []


def test_no_mode_exits_safely_without_writes(tmp_path: Path) -> None:
    importer = load_importer_module()
    seed_path = tmp_path / "listings.json"
    csv_path = tmp_path / "workspace_coordinate_manual_review.csv"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    write_seed(seed_path, [{"id": "seed-1"}])
    write_csv(csv_path, [make_valid_row("workspace-no-mode")])
    before_seed = seed_path.read_bytes()

    with pytest.raises(SystemExit) as exc:
        importer.main(["--seed-path", str(seed_path), "--csv-path", str(csv_path), "--backup-dir", str(backup_dir)])

    assert exc.value.code == 2
    assert seed_path.read_bytes() == before_seed
    assert list(backup_dir.glob("seed_data_backup_*.json")) == []


def test_dry_run_does_not_modify_seed_or_create_backup(tmp_path: Path) -> None:
    importer = load_importer_module()
    seed_path = tmp_path / "listings.json"
    csv_path = tmp_path / "workspace_coordinate_manual_review.csv"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    write_seed(seed_path, [{"id": "seed-1"}])
    write_csv(csv_path, [make_valid_row("workspace-dry-run")])
    before_seed = seed_path.read_bytes()

    exit_code = importer.main(
        [
            "--dry-run",
            "--seed-path",
            str(seed_path),
            "--csv-path",
            str(csv_path),
            "--backup-dir",
            str(backup_dir),
        ]
    )

    assert exit_code == 0
    assert seed_path.read_bytes() == before_seed
    assert list(backup_dir.glob("seed_data_backup_*.json")) == []


def test_apply_imports_only_eligible_and_preserves_slug_ids(tmp_path: Path) -> None:
    importer = load_importer_module()
    seed_path = tmp_path / "listings.json"
    csv_path = tmp_path / "workspace_coordinate_manual_review.csv"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    existing = [
        {"id": "existing-workspace", "name": "Existing"},
    ]
    write_seed(seed_path, existing)

    eligible = make_valid_row("workspace-alpha-verified")
    duplicate_existing = make_valid_row("existing-workspace")
    ineligible = make_valid_row("workspace-not-eligible")
    ineligible["import_eligible"] = "false"
    low_confidence = make_valid_row("workspace-low-confidence")
    low_confidence["coordinate_confidence"] = "low"
    missing_notes = make_valid_row("workspace-missing-notes")
    missing_notes["coordinate_review_notes"] = ""

    write_csv(
        csv_path,
        [eligible, duplicate_existing, ineligible, low_confidence, missing_notes],
    )

    exit_code = importer.main(
        [
            "--apply",
            "--seed-path",
            str(seed_path),
            "--csv-path",
            str(csv_path),
            "--backup-dir",
            str(backup_dir),
        ]
    )

    assert exit_code == 0
    backups = list(backup_dir.glob("seed_data_backup_*.json"))
    assert len(backups) == 1

    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    ids = [item["id"] for item in payload]
    assert len(ids) == len(set(ids))
    assert "workspace-alpha-verified" in ids
    assert "workspace-not-eligible" not in ids
    assert "workspace-low-confidence" not in ids
    assert "workspace-missing-notes" not in ids

    imported = next(item for item in payload if item["id"] == "workspace-alpha-verified")
    assert imported["id"] == "workspace-alpha-verified"
    assert not imported["id"].isdigit()
    assert imported["category"] == "workspace"
    assert imported["listing_type"] == "workspace"
    assert imported["status"] == "active"
    assert imported["verified_status"] is True
    assert imported["source_type"] == "verified_workspace_import"
    assert imported["import_batch"] == "GOOMBI_WORKSPACE_IMPORT_BATCH_1"
    assert imported["coordinate_source"] == "google_maps_manual_review"
    assert imported["coordinate_verified_at"] == "2026-06-03T09:00:00Z"
    assert imported["coordinate_confidence"] in {"high", "medium"}
    assert imported["coordinate_review_notes"]


def test_apply_skips_duplicate_rows_from_csv(tmp_path: Path) -> None:
    importer = load_importer_module()
    seed_path = tmp_path / "listings.json"
    csv_path = tmp_path / "workspace_coordinate_manual_review.csv"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    write_seed(seed_path, [{"id": "seed-1"}])

    row = make_valid_row("workspace-dup-check")
    write_csv(csv_path, [row, row.copy()])

    exit_code = importer.main(
        [
            "--apply",
            "--seed-path",
            str(seed_path),
            "--csv-path",
            str(csv_path),
            "--backup-dir",
            str(backup_dir),
        ]
    )

    assert exit_code == 0
    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    imported_ids = [item["id"] for item in payload if item["id"] == "workspace-dup-check"]
    assert imported_ids == ["workspace-dup-check"]