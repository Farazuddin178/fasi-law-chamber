-- ================================================================
-- RUN ONCE in Supabase Dashboard -> SQL Editor.
-- Safe to re-run.
--
-- THIS IS REQUIRED FOR PHONE NOTIFICATIONS TO WORK AT ALL.
--
-- The app now listens for new rows in public.notifications via Supabase
-- Realtime (hooks/useNotificationListener.ts). Realtime only emits
-- postgres_changes for tables that are members of the `supabase_realtime`
-- publication. If this table is not in it, the subscription connects
-- successfully and then simply never fires — no error, no notification.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Is the table already published? (informational)
-- ----------------------------------------------------------------
SELECT tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
 ORDER BY tablename;


-- ----------------------------------------------------------------
-- 2. Add notifications to the realtime publication.
--    Wrapped because ALTER PUBLICATION ... ADD TABLE errors if the table is
--    already a member, which would abort the rest of the script.
-- ----------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'notifications is already in supabase_realtime';
    WHEN undefined_object THEN
      RAISE NOTICE 'supabase_realtime publication not found — enable Realtime once in the dashboard, then re-run';
  END;
END $$;


-- ----------------------------------------------------------------
-- 3. Realtime honours row-level security. The app authenticates against a
--    custom users table rather than Supabase Auth, so it connects as `anon`
--    (see the note in supabase_fix_columns_rls_storage.sql). Without a SELECT
--    policy that anon can satisfy, Realtime silently withholds every row.
-- ----------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_all_access ON public.notifications;
CREATE POLICY notifications_all_access
  ON public.notifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- Delivery is filtered per user in the client subscription
-- (filter: user_id=eq.<id>), and this index backs both that and the
-- unread-count query behind the bell.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id) WHERE is_read = false;


-- ----------------------------------------------------------------
-- 4. Verify — notifications should now be listed.
-- ----------------------------------------------------------------
SELECT tablename AS realtime_enabled_tables
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename = 'notifications';

NOTIFY pgrst, 'reload schema';
