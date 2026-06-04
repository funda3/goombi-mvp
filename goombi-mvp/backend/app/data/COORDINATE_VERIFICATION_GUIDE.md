# Goombi Coordinate Verification Guide
Version: v0.1.22B | Date: 2026-06-03

## Purpose
Every listing coordinate must be manually verified before import_eligible = true.
Bad map pins damage trust and make Goombi look amateur. Do not rush this.

## Priority order for coordinate sources
1. Official provider website (map pin or exact address)
2. Google Maps manual review (search exact name + address, confirm pin)
3. OpenStreetMap / Nominatim manual review
4. Provider site + maps cross-check (safest)

## Accepted coordinate_source values
- official_provider_page
- google_maps_manual_review
- openstreetmap_manual_review
- provider_site_plus_maps_review

## Accepted coordinate_confidence values
- high ? name, address, suburb, and map pin all match exactly
- medium ? address confirmed, pin approximately correct
- low ? do not import

## Step-by-step verification for each row
1. Search exact provider name + workspace name in Google Maps
2. Confirm the exact address matches the CSV row
3. Click the map pin ? do not use suburb-level result
4. Copy latitude and longitude from the pin URL or right-click menu
5. Paste into CSV
6. Set coordinate_source and coordinate_confidence
7. Write a brief coordinate_review_notes entry
8. Set import_eligible = true ONLY when:
   - geocode_status = verified
   - coordinate_confidence = medium or high
   - coordinate_source is an accepted value
   - latitude and longitude are valid numbers

## Never acceptable
- City centroid coordinates (e.g. -26.2041, 28.0473 for all Johannesburg listings)
- Suburb centroid (e.g. "roughly Sandton")
- Guessed coordinates
- AI-generated coordinates without map verification

## Import process after verification
Once 10 rows have import_eligible = true, run:
python C:\Goombi\goombi-mvp\backend\app\data\import_verified_workspaces.py
