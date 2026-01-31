-- Migration: Add submission_dates field to cases table
-- Description: Adds tracking for case submissions, returns, and changes
-- Date: 2026-01-31

-- This migration adds support for tracking multiple submissions per case
-- including submission dates, filing dates, return dates, and change tracking

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS submission_dates JSONB DEFAULT '[]'::jsonb;

-- The submission_dates column stores an array of submission objects with the following structure:
-- {
--   "submission_number": number,
--   "submission_date": "YYYY-MM-DD",
--   "submitted_by": "string",
--   "due_date": "YYYY-MM-DD",
--   "filing_date": "YYYY-MM-DD",
--   "resubmission_date": "YYYY-MM-DD",
--   "return_date": "YYYY-MM-DD",
--   "return_taken_by": "string",
--   "changes_made": "string",
--   "changes_requested": "string",
--   "changes_requested_by": "string",
--   "notes": "string"
-- }

-- Example data insertion:
-- UPDATE cases
-- SET submission_dates = jsonb_build_array(
--   jsonb_build_object(
--     'submission_number', 1,
--     'submission_date', '2026-01-31',
--     'submitted_by', 'John Doe',
--     'due_date', '2026-02-07',
--     'filing_date', '2026-02-05',
--     'resubmission_date', NULL,
--     'return_date', NULL,
--     'return_taken_by', NULL,
--     'changes_made', NULL,
--     'changes_requested', NULL,
--     'changes_requested_by', NULL,
--     'notes', 'Initial submission'
--   )
-- )
-- WHERE id = 'case_id';

-- Verify the migration
-- SELECT id, case_number, submission_dates FROM cases LIMIT 5;
