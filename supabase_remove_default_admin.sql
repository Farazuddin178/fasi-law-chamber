-- ================================================================
-- Remove the seeded/default admin account, keeping only the real admin.
--
-- RUN THIS ONE STEP AT A TIME in Supabase Dashboard -> SQL Editor.
-- Unlike the other migrations in this repo, this one CHANGES WHO CAN LOG IN,
-- so it is deliberately not a single click-and-run script.
--
-- There is no default admin defined anywhere in the codebase — it only exists
-- as a row in public.users, which is why this cannot be fixed from the app.
-- ================================================================


-- ----------------------------------------------------------------
-- STEP 1 — LOOK FIRST. Run this on its own and read the output.
-- Confirm which row is yours before deleting anything.
-- ----------------------------------------------------------------
SELECT id, email, full_name, role, is_active, created_at
  FROM public.users
 ORDER BY role, created_at;


-- ----------------------------------------------------------------
-- STEP 2 — Deactivate every admin except yours.
--
-- Edit the email below if your account uses a different address. This only
-- flips is_active, so nothing is destroyed and you can undo it by setting the
-- flag back. Do this before STEP 3 and confirm you can still log in.
-- ----------------------------------------------------------------
UPDATE public.users
   SET is_active = false
 WHERE role = 'admin'
   AND lower(email) <> lower('mohammedfarazuddin01@gmail.com');


-- Verify: your account should be the only admin left with is_active = true.
SELECT email, full_name, role, is_active
  FROM public.users
 WHERE role = 'admin'
 ORDER BY is_active DESC;


-- ----------------------------------------------------------------
-- STEP 3 — OPTIONAL hard delete. Only after STEP 2, and only once you have
-- logged in successfully with your own account in a fresh browser session.
--
-- WARNING: other tables reference users.id (cases.created_by,
-- expenses.submitted_by, tasks.assigned_to, task_comments.user_id, audit rows…).
-- Deleting a user that owns records will either fail on a foreign key or, if
-- the constraint cascades, take those records with it. Deactivating in STEP 2
-- is the safer end state and is usually enough.
--
-- Uncomment only if you are certain the account owns no data:
-- ----------------------------------------------------------------
-- DELETE FROM public.users
--  WHERE role = 'admin'
--    AND is_active = false
--    AND lower(email) <> lower('mohammedfarazuddin01@gmail.com');


-- ----------------------------------------------------------------
-- Check what a candidate account actually owns before deleting it.
-- Replace the email, then run.
-- ----------------------------------------------------------------
-- SELECT
--   (SELECT count(*) FROM public.cases    c WHERE c.created_by   = u.id) AS cases_created,
--   (SELECT count(*) FROM public.expenses e WHERE e.submitted_by = u.id) AS expenses,
--   (SELECT count(*) FROM public.tasks    t WHERE t.assigned_to  = u.id) AS tasks_assigned
-- FROM public.users u
-- WHERE lower(u.email) = lower('the-account-you-want-to-delete@example.com');
