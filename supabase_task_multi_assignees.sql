-- ================================================================
-- RUN ONCE in Supabase Dashboard -> SQL Editor, then hard-refresh the app.
-- Safe to re-run: every statement is IF NOT EXISTS / DROP + CREATE.
--
-- Feature: assign the same task to multiple users at once, and notify all
-- of them (not just one). tasks.assigned_to stays as the "primary" assignee
-- (whoever accept/decline still applies to — unchanged behavior), and this
-- table records every co-assignee. The frontend degrades gracefully if this
-- table does not exist yet (task saving still works via assigned_to alone),
-- but nobody except the primary assignee gets notified until this is run.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees (user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Same anon-role policy pattern as every other table (see CONTEXT.md §3.1 —
-- this app authenticates against a custom `users` table, not Supabase Auth,
-- so every request reaches PostgREST as `anon`, not `authenticated`).
DROP POLICY IF EXISTS task_assignees_all_access ON public.task_assignees;
CREATE POLICY task_assignees_all_access
  ON public.task_assignees
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
