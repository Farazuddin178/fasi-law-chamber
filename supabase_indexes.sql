-- ============================================================
-- PERFORMANCE INDEXES FOR LEGAL CASE MANAGEMENT
-- Run AFTER supabase_migration_add_dates.sql
-- Safe to re-run: all statements use IF NOT EXISTS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── cases table ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cases_created_at
  ON cases (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cases_status
  ON cases (status);

CREATE INDEX IF NOT EXISTS idx_cases_status_created
  ON cases (status, created_at DESC);

-- All date columns (hearing_date and mention_date added via migration)
CREATE INDEX IF NOT EXISTS idx_cases_hearing_date
  ON cases (hearing_date) WHERE hearing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_mention_date
  ON cases (mention_date) WHERE mention_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_return_date
  ON cases (return_date) WHERE return_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_listing_date
  ON cases (listing_date) WHERE listing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_filing_date
  ON cases (filing_date) WHERE filing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_disp_date
  ON cases (disp_date) WHERE disp_date IS NOT NULL;

-- ILIKE text searches (requires pg_trgm)
CREATE INDEX IF NOT EXISTS idx_cases_case_number_trgm
  ON cases USING gin (case_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_primary_petitioner_trgm
  ON cases USING gin (primary_petitioner gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_primary_respondent_trgm
  ON cases USING gin (primary_respondent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_cnr_trgm
  ON cases USING gin (cnr gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_flc_number_trgm
  ON cases USING gin (flc_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_created_by
  ON cases (created_by);


-- ── tasks table ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_case_id
  ON tasks (case_id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at
  ON tasks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_created
  ON tasks (assigned_to, created_at DESC);


-- ── audit_logs table ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id
  ON audit_logs (case_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by
  ON audit_logs (changed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON audit_logs (timestamp DESC);


-- ── announcements table ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_visible_to
  ON announcements (visible_to);


-- ── fcm_tokens table ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id
  ON fcm_tokens (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_user_token
  ON fcm_tokens (user_id, token);


-- ── documents table ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_case_id
  ON documents (case_id);


-- ── expenses table ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by
  ON expenses (submitted_by);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at
  ON expenses (created_at DESC);


-- ── ANALYZE ───────────────────────────────────────────────────

ANALYZE cases;
ANALYZE tasks;
ANALYZE audit_logs;
ANALYZE announcements;
