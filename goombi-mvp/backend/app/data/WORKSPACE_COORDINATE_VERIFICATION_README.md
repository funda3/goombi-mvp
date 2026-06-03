# Workspace Coordinate Verification Workbench

`workspace_candidates_gauteng_verified.json` is a verification workbench for Gauteng workspace candidates. It is not a public listing file, and records in it must not appear on the public Goombi map until they pass coordinate and status validation.

The source staging file is `workspace_candidates_gauteng.json`. Candidate records may describe real or planned workspace locations, but they are quarantined from `/api/listings` until manually verified.

## Current State

All generated workbench records start with:

- `latitude: null`
- `longitude: null`
- `geocode_status: "needs_coordinate_review"`
- `coordinate_source: null`
- `coordinate_verified_at: null`
- `coordinate_confidence: null`
- `coordinate_review_notes: "Pending manual coordinate verification."`
- `import_eligible: false`

Do not change `import_eligible` to `true` until the record is active, has verified coordinates, and has medium or high coordinate confidence.

## Accepted Coordinate Sources

Use only these coordinate proof values:

- `official_provider_page`
- `google_maps_manual_review`
- `openstreetmap_manual_review`
- `provider_site_plus_maps_review`

## Rejected Coordinate Sources

Do not use these for public map import:

- `estimated`
- `guessed`
- `suburb_centroid`
- `city_centroid`
- `approximate`

## Import Eligibility Rule

A future import patch may import only records where all of the following are true:

- `status` is `active`
- `geocode_status` is `verified`
- `latitude` is numeric
- `longitude` is numeric
- `coordinate_source` is one of the accepted values above
- `coordinate_verified_at` is present
- `coordinate_confidence` is `medium` or `high`
- `import_eligible` is `true`

Records with `status: future` or `status: closed` must not become active public markers. Future locations such as Workshop17 Hazelwood / Opening 2027 must remain non-public until they become active and coordinates are verified.
