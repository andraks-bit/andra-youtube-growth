-- ─── MIGRATION 002: Media metadata ───────────────────────────────────────────
-- Adds slug, rich-text metadata, tag arrays, and SEO fields to boat_images and
-- boats. Creates a materialised tag catalogue for the /tags index page.
--
-- Run order: must come after 001_initial.sql.
-- Safe to re-run: all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ─── boat_images: new columns ────────────────────────────────────────────────

ALTER TABLE boat_images
  ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS tags         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_type   TEXT NOT NULL DEFAULT 'image',  -- 'image' | 'video'
  ADD COLUMN IF NOT EXISTS video_url    TEXT;  -- YouTube / Vimeo embed URL

-- Index for single-image lookup by slug (sparse: only rows that have a slug)
CREATE INDEX IF NOT EXISTS boat_images_slug_idx ON boat_images(slug) WHERE slug IS NOT NULL;

-- GIN index for fast @>, &&, ANY() queries on tags array
CREATE INDEX IF NOT EXISTS boat_images_tags_idx ON boat_images USING gin(tags);

-- ─── boats: new columns ──────────────────────────────────────────────────────

ALTER TABLE boats
  ADD COLUMN IF NOT EXISTS tags            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_title       TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS boats_tags_idx ON boats USING gin(tags);

-- ─── Materialised view: tag_stats ────────────────────────────────────────────
-- Aggregates every tag from both tables so the /tags page can render a full
-- catalogue with per-source counts without hitting multiple tables at runtime.
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY tag_stats;

CREATE MATERIALIZED VIEW IF NOT EXISTS tag_stats AS
SELECT
  tag,
  count(*) FILTER (WHERE source = 'boat')  AS boat_count,
  count(*) FILTER (WHERE source = 'image') AS image_count,
  count(*) AS total_count
FROM (
  SELECT unnest(tags) AS tag, 'boat'  AS source FROM boats       WHERE status = 'active'
  UNION ALL
  SELECT unnest(tags) AS tag, 'image' AS source FROM boat_images WHERE tags != '{}'
) sub
GROUP BY tag
ORDER BY total_count DESC;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS tag_stats_tag_idx ON tag_stats(tag);

-- ─── RLS note ────────────────────────────────────────────────────────────────
-- boat_images already has a "boat_images_read" policy (for select using (true))
-- that covers ALL columns, so the new slug / title / description / tags columns
-- are automatically publicly readable. No new policy is needed.
--
-- The tag_stats materialised view is in the public schema. By default Supabase
-- grants SELECT to the anon and authenticated roles on new objects created by
-- the postgres superuser — but to be explicit we grant it here too.

GRANT SELECT ON tag_stats TO anon, authenticated;
