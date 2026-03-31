-- =============================================
-- TMDB Review Import — Schema Migration
-- Run this BEFORE running import-tmdb-reviews.cjs
-- =============================================

-- 1. Add 'tivi_content' as allowed target_type for comments
-- The existing CHECK constraint only allows 'post' and 'feed_item'.
-- We need to add 'tivi_content' for TMDB reviews referencing DashTivi+ content.

-- Drop the existing constraint and recreate with the new type
ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS comments_target_type_check;

ALTER TABLE comments
  ADD CONSTRAINT comments_target_type_check
  CHECK (target_type IN ('post', 'feed_item', 'tivi_content'));

-- 2. Create index for efficient TiVi content review lookups
CREATE INDEX IF NOT EXISTS idx_comments_tivi_content
  ON comments(target_id, created_at DESC)
  WHERE target_type = 'tivi_content' AND is_active = true;

-- 3. Create index for filtering by author (TMDB system user)
CREATE INDEX IF NOT EXISTS idx_comments_author_type
  ON comments(author_id, target_type)
  WHERE is_active = true;

-- 4. Add the TMDB_IMPORT system user to users table
-- (The script also does this, but having it in the migration is safer)
INSERT INTO users (core_id, full_name)
VALUES ('TMDB_IMPORT', 'TMDB Community')
ON CONFLICT (core_id) DO NOTHING;

-- 5. Create a helper function to get reviews for a TiVi content item
CREATE OR REPLACE FUNCTION get_tivi_reviews(
  p_content_uuid UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  comment_id UUID,
  author_name TEXT,
  content TEXT,
  reaction_count INT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as comment_id,
    u.full_name as author_name,
    c.content,
    c.reaction_count,
    c.created_at
  FROM comments c
  JOIN users u ON u.core_id = c.author_id
  WHERE c.target_type = 'tivi_content'
    AND c.target_id = p_content_uuid
    AND c.is_active = true
  ORDER BY c.reaction_count DESC, c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update get_comments to also support 'tivi_content' target type
-- (The existing function already works polymorphically, but the CHECK
--  constraint on target_type was blocking tivi_content inserts.)

-- =============================================
-- VERIFICATION
-- After running this migration, verify with:
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'comments'::regclass AND contype = 'c';
--
-- Should show: target_type IN ('post', 'feed_item', 'tivi_content')
-- =============================================
