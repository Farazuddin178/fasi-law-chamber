-- ================================================================
-- MIGRATION: add hearing_date and mention_date to cases table
-- Run ONCE in Supabase Dashboard → SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ================================================================

-- hearing_date: the next scheduled hearing date for the case
--   Source: court API listingdate / nextHearingDate
ALTER TABLE cases ADD COLUMN IF NOT EXISTS hearing_date date;

-- mention_date: the last mention / return date of the case
--   Source: court API returndate / mentionDate
ALTER TABLE cases ADD COLUMN IF NOT EXISTS mention_date date;

-- Indexes for both new columns (partial, only non-NULL rows)
CREATE INDEX IF NOT EXISTS idx_cases_hearing_date
  ON cases (hearing_date) WHERE hearing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_mention_date
  ON cases (mention_date) WHERE mention_date IS NOT NULL;

-- Refresh planner statistics
ANALYZE cases;
