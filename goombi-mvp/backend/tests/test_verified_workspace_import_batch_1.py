import json
import re
from pathlib import Path

from app.models import Listing


BATCH_ID = "GOOMBI_WORKSPACE_IMPORT_BATCH_1"
DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "listings.json"


def load_listings():
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def batch_1_records():
    listings = load_listings()
    return [item for item in listings if item.get("import_batch") == BATCH_ID]


def test_verified_gauteng_workspace_batch_1_count_is_10():
    records = batch_1_records()

    assert len(records) == 10


def test_verified_gauteng_workspace_batch_1_has_correct_import_metadata():
    records = batch_1_records()

    assert records
    assert all(record.get("import_batch") == BATCH_ID for record in records)
    assert all(record.get("source_type") == "verified_workspace_import" for record in records)


def test_verified_gauteng_workspace_batch_1_ids_are_slug_ids_not_numeric_ids():
    records = batch_1_records()

    assert records

    for record in records:
        record_id = str(record.get("id", ""))

        assert record_id
        assert not record_id.isdigit()
        assert re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", record_id)


def test_verified_gauteng_workspace_batch_1_records_are_verified():
    records = batch_1_records()

    assert records
    assert all(record.get("verified_status") is True for record in records)


def test_verified_gauteng_workspace_batch_1_coordinate_fields_exist():
    records = batch_1_records()

    assert records

    coordinate_proof_keys = {
        "coordinate_source",
        "coordinate_source_url",
        "coordinate_evidence",
        "coordinate_evidence_url",
        "coordinate_proof",
        "coordinate_proof_url",
        "coordinate_notes",
        "coordinate_review_notes",
        "coordinates_verified_by",
    }

    for record in records:
        assert record.get("latitude") is not None
        assert record.get("longitude") is not None

        float(record["latitude"])
        float(record["longitude"])

        assert any(record.get(key) for key in coordinate_proof_keys), (
            f"Missing coordinate proof field for {record.get('id')}"
        )


def test_innovation_hub_workspace_type_is_accepted_by_backend_listing_model():
    records = batch_1_records()
    innovation_hub_records = [
        record for record in records
        if record.get("workspace_type") == "innovation_hub"
    ]

    assert innovation_hub_records, "Expected at least one Batch 1 innovation_hub record"

    for record in innovation_hub_records:
        Listing(**record)
