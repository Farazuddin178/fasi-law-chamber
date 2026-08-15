-- ================================================================
-- RUN ONCE in Supabase Dashboard -> SQL Editor, then hard-refresh the app.
-- Safe to re-run: every statement is IF NOT EXISTS or DROP + CREATE.
--
-- Fixes:
--   1. "column cases.hearing_date does not exist"          -> Cases page empty
--      "Could not find the 'hearing_date' column of 'cases'
--       in the schema cache"                               -> Save case fails
--   2. "new row violates row-level security policy for
--       table causelist_history"                           -> Save cause list fails
--   3. documents bucket not readable                       -> Download document fails
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Missing date columns on `cases`
--
-- supabase_migration_add_dates.sql and supabase_indexes.sql were never
-- applied to this database — supabase_indexes.sql even builds indexes on
-- hearing_date/mention_date, which cannot exist yet. The app reads and
-- writes all five of these columns, so add the whole set at once rather
-- than discovering them one failure at a time.
-- ----------------------------------------------------------------
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS hearing_date      date;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS mention_date      date;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS return_date       date;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS listing_date      date;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS post_listing_date date;

-- Partial indexes: the date filters on the Cases page only ever match
-- non-NULL rows, so NULLs are not worth indexing.
CREATE INDEX IF NOT EXISTS idx_cases_hearing_date
  ON public.cases (hearing_date) WHERE hearing_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_mention_date
  ON public.cases (mention_date) WHERE mention_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_return_date
  ON public.cases (return_date)  WHERE return_date  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_listing_date
  ON public.cases (listing_date) WHERE listing_date IS NOT NULL;

ANALYZE public.cases;


-- ----------------------------------------------------------------
-- 2. RLS on `causelist_history`
--
-- IMPORTANT — why these policies target `anon`:
-- This app does NOT sign users in through Supabase Auth. AuthContext.login()
-- authenticates against a custom `users` table via the `auth-login` edge
-- function, and its supabase.auth.signInWithPassword() call is best-effort
-- and swallowed. So requests reach PostgREST as the `anon` role and
-- auth.uid() is NULL. Any policy written as `TO authenticated` or
-- `USING (auth.uid() = ...)` will reject every write — which is exactly the
-- error you are seeing on Save Cause List.
--
-- SECURITY NOTE: this grants full access to anyone holding the anon key,
-- which is shipped in the frontend bundle and therefore public. That matches
-- how the rest of your tables are already configured, so this does not make
-- things worse — but it does mean the database is effectively open. See the
-- note at the bottom of this file.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.causelist_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advocate_code text,
  date          text,
  total_cases   integer,
  cases         jsonb,
  saved_at      timestamptz DEFAULT now(),
  saved_by      uuid
);

ALTER TABLE public.causelist_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS causelist_history_all_access ON public.causelist_history;
CREATE POLICY causelist_history_all_access
  ON public.causelist_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_causelist_history_saved_at
  ON public.causelist_history (saved_at DESC);


-- ----------------------------------------------------------------
-- 3. Storage policies for the `documents` bucket
--
-- Uploading works today, so an INSERT policy already exists; downloading
-- calls storage.download(), which needs SELECT on storage.objects. If that
-- policy is missing, the download fails while the upload keeps working —
-- which matches the symptom. Re-declaring all three is harmless.
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS documents_read   ON storage.objects;
DROP POLICY IF EXISTS documents_write  ON storage.objects;
DROP POLICY IF EXISTS documents_delete ON storage.objects;

CREATE POLICY documents_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'documents');

CREATE POLICY documents_write ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY documents_delete ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'documents');


-- ----------------------------------------------------------------
-- 4. Force PostgREST to reload its schema cache
--
-- Without this, the client keeps reporting "Could not find the
-- 'hearing_date' column of 'cases' in the schema cache" for a few minutes
-- after the columns already exist.
-- ----------------------------------------------------------------
NOTIFY pgrst, 'reload schema';


-- ----------------------------------------------------------------
-- Verify (optional) — should list all five date columns.
-- ----------------------------------------------------------------
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'cases'
--    AND column_name LIKE '%date%'
--  ORDER BY column_name;


-- ================================================================
-- FOLLOW-UP, not required to fix today's errors:
--
-- Because login bypasses Supabase Auth, every policy above has to trust the
-- anon key, and that key is public in the frontend bundle. Anyone who opens
-- devtools can read and write every table directly. Closing that properly
-- means either issuing real Supabase Auth sessions at login (so auth.uid()
-- works and policies can be scoped per user/role), or routing writes through
-- edge functions that use the service-role key server-side.
-- ================================================================
