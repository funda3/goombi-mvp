-- ============================================================
-- GOOMBI CORE DATABASE SCHEMA
-- Run once against your Neon PostgreSQL instance
-- ============================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- ============================================================
-- PROVINCES lookup
-- ============================================================
CREATE TABLE IF NOT EXISTS provinces (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    ta_geo_id   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO provinces (code, name, ta_geo_id) VALUES
    ('gauteng',       'Gauteng',       'g312568'),
    ('western_cape',  'Western Cape',  'g312653'),
    ('kwazulu_natal', 'KwaZulu-Natal', 'g312559')
ON CONFLICT DO NOTHING;

-- ============================================================
-- VENUES master table
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goombi_slug           TEXT UNIQUE NOT NULL,
    ta_location_id        INTEGER UNIQUE,
    google_place_id       TEXT,

    category              TEXT NOT NULL DEFAULT 'restaurant',
    subcategory           TEXT[],

    province              TEXT NOT NULL REFERENCES provinces(code),
    city                  TEXT NOT NULL,
    suburb                TEXT,
    neighbourhood_tag     TEXT,

    address               TEXT,
    lat                   NUMERIC(9,6),
    lng                   NUMERIC(9,6),

    name                  TEXT NOT NULL,
    ta_rating             NUMERIC(2,1),
    ta_review_count       INTEGER,
    ta_price_level        TEXT,
    ta_cuisine_tags       TEXT[],
    ta_city_rank          INTEGER,
    ta_province_rank      INTEGER,
    ta_travellers_choice  BOOLEAN DEFAULT FALSE,
    ta_best_of_best       BOOLEAN DEFAULT FALSE,
    ta_url                TEXT,
    ta_last_refreshed     TIMESTAMPTZ,

    google_rating         NUMERIC(2,1),
    google_review_count   INTEGER,
    phone                 TEXT,
    website               TEXT,
    google_maps_url       TEXT,
    google_last_refreshed TIMESTAMPTZ,

    zar_price_min         INTEGER,
    zar_price_max         INTEGER,
    operating_hours       JSONB,

    booking_url           TEXT,
    menu_url              TEXT,
    instagram_handle      TEXT,
    facebook_url          TEXT,

    vibe_tags             TEXT[],
    music_genre           TEXT[],

    dress_code            TEXT,
    cover_charge_zar      INTEGER,
    age_restriction       INTEGER,
    booking_required      BOOLEAN,
    accepts_walkins       BOOLEAN DEFAULT TRUE,

    hero_image_url        TEXT,
    photo_urls            TEXT[],

    is_active             BOOLEAN DEFAULT TRUE,
    is_verified           BOOLEAN DEFAULT FALSE,
    is_featured           BOOLEAN DEFAULT FALSE,
    data_quality_score    INTEGER DEFAULT 0,

    notes                 TEXT,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_province      ON venues(province);
CREATE INDEX IF NOT EXISTS idx_venues_city          ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_suburb        ON venues(suburb);
CREATE INDEX IF NOT EXISTS idx_venues_category      ON venues(category);
CREATE INDEX IF NOT EXISTS idx_venues_ta_rating     ON venues(ta_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_venues_ta_reviews    ON venues(ta_review_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_venues_quality       ON venues(data_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_venues_location      ON venues USING GIST (
    ll_to_earth(lat::float8, lng::float8)
) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_name_trgm
    ON venues USING GIN (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venues_updated_at ON venues;
CREATE TRIGGER trg_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SCRAPE RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS scrape_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_type        TEXT NOT NULL,
    province        TEXT REFERENCES provinces(code),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    pages_scraped   INTEGER DEFAULT 0,
    venues_found    INTEGER DEFAULT 0,
    venues_inserted INTEGER DEFAULT 0,
    venues_updated  INTEGER DEFAULT 0,
    errors          INTEGER DEFAULT 0,
    notes           TEXT
);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================
CREATE OR REPLACE VIEW province_stats AS
SELECT
    province,
    COUNT(*)                                        AS total_venues,
    COUNT(*) FILTER (WHERE is_active)               AS active_venues,
    COUNT(*) FILTER (WHERE is_verified)             AS verified_venues,
    COUNT(*) FILTER (WHERE ta_rating >= 4.5)        AS high_rated,
    COUNT(*) FILTER (WHERE ta_review_count >= 500)  AS high_volume,
    ROUND(AVG(data_quality_score)::numeric, 1)      AS avg_quality_score,
    COUNT(*) FILTER (WHERE ta_travellers_choice)    AS travellers_choice
FROM venues
GROUP BY province;

CREATE OR REPLACE VIEW top_venues_by_city AS
SELECT
    city, suburb, name, category,
    ta_rating, ta_review_count, ta_price_level,
    data_quality_score, is_verified,
    ROW_NUMBER() OVER (
        PARTITION BY city
        ORDER BY ta_review_count DESC NULLS LAST, ta_rating DESC NULLS LAST
    ) AS rank_in_city
FROM venues
WHERE is_active = TRUE;

CREATE OR REPLACE VIEW enrichment_queue AS
SELECT
    id, goombi_slug, name, city, suburb, province,
    ta_rating, ta_review_count, data_quality_score,
    CASE WHEN operating_hours IS NULL THEN TRUE ELSE FALSE END AS missing_hours,
    CASE WHEN phone IS NULL THEN TRUE ELSE FALSE END AS missing_phone,
    CASE
        WHEN vibe_tags IS NULL OR array_length(vibe_tags, 1) = 0
        THEN TRUE ELSE FALSE
    END AS missing_vibe_tags,
    CASE WHEN hero_image_url IS NULL THEN TRUE ELSE FALSE END AS missing_hero_image
FROM venues
WHERE is_active = TRUE
  AND data_quality_score < 60
ORDER BY ta_review_count DESC NULLS LAST;
