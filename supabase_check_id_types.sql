-- ================================================================
-- DIAGNOSTIC — run in Supabase Dashboard -> SQL Editor and send the output.
-- Read-only: this script changes nothing.
--
-- Context: adding a case and submitting an expense both failed with
--     invalid input syntax for type uuid: "1363"
-- meaning a non-UUID value ("1363") was being written into a uuid column.
--
-- The app now (a) prefers a UUID-shaped field when reading the logged-in user's
-- id and (b) refuses to send a non-UUID into a uuid column, so saving works
-- either way. But if the underlying types genuinely disagree, created_by /
-- submitted_by will be stored as NULL and you will lose "who added this".
-- These queries show whether that is happening.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. What type is each id / owner column?
--    users.id should match cases.created_by and expenses.submitted_by.
-- ----------------------------------------------------------------
SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (
        (table_name = 'users'         AND column_name IN ('id', 'user_id', 'uid'))
     OR (table_name = 'cases'         AND column_name IN ('id', 'created_by'))
     OR (table_name = 'expenses'      AND column_name IN ('id', 'case_id', 'submitted_by', 'approved_by'))
     OR (table_name = 'tasks'         AND column_name IN ('id', 'assigned_to', 'created_by'))
     OR (table_name = 'task_comments' AND column_name IN ('id', 'task_id', 'user_id'))
     OR (table_name = 'documents'     AND column_name IN ('id', 'uploaded_by'))
     OR (table_name = 'notifications' AND column_name IN ('id', 'user_id'))
   )
 ORDER BY table_name, column_name;


-- ----------------------------------------------------------------
-- 2. What do actual user ids look like?
--    If `id` here is an integer like 1363, that is the value the app was
--    picking up and pushing into the uuid columns.
-- ----------------------------------------------------------------
SELECT id, email, full_name, role
  FROM public.users
 ORDER BY created_at
 LIMIT 10;


-- ----------------------------------------------------------------
-- 3. Are recent rows losing their owner?
--    A rising count of NULLs here means the guard is firing and attribution is
--    being dropped - the column types need to be reconciled.
-- ----------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.cases    WHERE created_by   IS NULL) AS cases_without_creator,
  (SELECT count(*) FROM public.cases)                               AS cases_total,
  (SELECT count(*) FROM public.expenses WHERE submitted_by IS NULL) AS expenses_without_submitter,
  (SELECT count(*) FROM public.expenses)                            AS expenses_total;


-- ----------------------------------------------------------------
-- 4. Foreign keys already declared on these columns (informational).
-- ----------------------------------------------------------------
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema    = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
  AND kcu.column_name IN ('created_by', 'submitted_by', 'approved_by',
                          'assigned_to', 'user_id', 'uploaded_by', 'case_id')
ORDER BY tc.table_name, kcu.column_name;


-- ================================================================
-- Send me the output of queries 1 and 3 and I will write the corrective
-- migration. Do NOT change a column type by guessing: altering a key column
-- that other tables reference has to be done in the right order, or the
-- foreign keys break.
-- ================================================================
