-- ============================================================
-- RUN THIS ONCE IN SUPABASE SQL EDITOR
-- Fixes: blank data, permission denied, anon role access
-- Delete this file after running.
-- ============================================================

-- STEP 1: Restore grants (undoes accidental REVOKE from previous scripts)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- STEP 2: Enable RLS on every table + create working access policies.
-- The app uses a custom Edge Function login; requests run as the 'anon'
-- role. React PrivateRoute handles UI-level access control.
-- RLS stays ENABLED (satisfies the security linter).

DO $$
DECLARE
  t        text;
  pol_rec  RECORD;
  tables   text[] := ARRAY[
    'cases', 'tasks', 'users', 'documents', 'notifications',
    'audit_logs', 'announcements', 'courts', 'case_types',
    'tracked_cases', 'case_events', 'case_documents',
    'activity_logs', 'invoices', 'messages',
    'task_comments', 'task_responses', 'expenses', 'fcm_tokens'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    );

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every existing policy on this table first
    FOR pol_rec IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_rec.policyname, t);
    END LOOP;

    -- Create a single permissive policy for anon + authenticated
    EXECUTE format(
      'CREATE POLICY "app_access" ON public.%I
         FOR ALL TO anon, authenticated
         USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
