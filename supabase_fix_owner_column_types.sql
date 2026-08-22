-- ================================================================
-- Align the "owner" columns with users.id, so the app can record who created
-- a case / submitted an expense again.
--
-- RUN IN Supabase Dashboard -> SQL Editor. Safe to re-run.
--
-- BACKGROUND
-- Saving a case or an expense failed with:
--     invalid input syntax for type uuid: "1363"
-- The foreign-key listing showed that every owner column WITH a foreign key to
-- users.id works fine (notifications.user_id, tasks.assigned_to,
-- case_submissions.created_by, tracked_cases.user_id), while the columns that
-- break have NO foreign key at all: cases.created_by, expenses.submitted_by,
-- expenses.approved_by, documents.uploaded_by. Those were created as `uuid` and
-- never connected to users, so they could never hold a real user id.
--
-- WHAT THIS DOES
-- For each of those columns: if its type does not match users.id AND the column
-- holds no data, it is retyped to match and a foreign key is added. If the
-- column DOES hold data, it is left completely alone and a notice is raised -
-- this script will never destroy existing values.
--
-- Everything runs in one transaction: if any step fails, nothing changes.
-- ================================================================

BEGIN;

DO $$
DECLARE
  users_id_type   text;
  target          record;
  col_type        text;
  populated_rows  bigint;
  fk_name         text;
BEGIN
  SELECT data_type INTO users_id_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

  IF users_id_type IS NULL THEN
    RAISE EXCEPTION 'public.users.id not found - aborting without changes';
  END IF;

  RAISE NOTICE 'users.id is of type: %', users_id_type;

  FOR target IN
    SELECT * FROM (VALUES
      ('cases',     'created_by'),
      ('expenses',  'submitted_by'),
      ('expenses',  'approved_by'),
      ('documents', 'uploaded_by')
    ) AS t(tbl, col)
  LOOP
    SELECT data_type INTO col_type
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = target.tbl
       AND column_name  = target.col;

    IF col_type IS NULL THEN
      RAISE NOTICE 'SKIP %.% - column does not exist', target.tbl, target.col;
      CONTINUE;
    END IF;

    IF col_type = users_id_type THEN
      RAISE NOTICE 'OK   %.% already matches users.id (%)', target.tbl, target.col, col_type;
    ELSE
      -- Never retype a column that still holds values; a bad cast would lose them.
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NOT NULL',
                     target.tbl, target.col)
        INTO populated_rows;

      IF populated_rows > 0 THEN
        RAISE NOTICE
          'SKIP %.% - type is % but users.id is %, and % row(s) still hold values. Left untouched; migrate those values manually.',
          target.tbl, target.col, col_type, users_id_type, populated_rows;
        CONTINUE;
      END IF;

      RAISE NOTICE 'FIX  %.% : % -> %', target.tbl, target.col, col_type, users_id_type;

      -- Drop any FK first so the retype cannot fail on a dangling constraint.
      SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema    = 'public'
         AND tc.table_name      = target.tbl
         AND kcu.column_name    = target.col
       LIMIT 1;

      IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', target.tbl, fk_name);
      END IF;

      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE %s USING NULL',
        target.tbl, target.col, users_id_type
      );

      -- ON DELETE SET NULL: removing a user must not delete their cases.
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE SET NULL',
        target.tbl,
        target.tbl || '_' || target.col || '_fkey',
        target.col
      );
    END IF;
  END LOOP;
END $$;


-- expenses.case_id must match cases.id for the same reason.
DO $$
DECLARE
  cases_id_type text;
  col_type      text;
  populated     bigint;
BEGIN
  SELECT data_type INTO cases_id_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'id';

  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'case_id';

  IF col_type IS NULL OR cases_id_type IS NULL THEN
    RAISE NOTICE 'SKIP expenses.case_id - column missing';
  ELSIF col_type = cases_id_type THEN
    RAISE NOTICE 'OK   expenses.case_id already matches cases.id (%)', col_type;
  ELSE
    SELECT count(*) INTO populated FROM public.expenses WHERE case_id IS NOT NULL;
    IF populated > 0 THEN
      RAISE NOTICE 'SKIP expenses.case_id - % row(s) hold values; migrate manually', populated;
    ELSE
      RAISE NOTICE 'FIX  expenses.case_id : % -> %', col_type, cases_id_type;
      EXECUTE format('ALTER TABLE public.expenses ALTER COLUMN case_id TYPE %s USING NULL', cases_id_type);
      ALTER TABLE public.expenses
        ADD CONSTRAINT expenses_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ----------------------------------------------------------------
-- Verify: every row below should show the same data_type in each pair.
-- ----------------------------------------------------------------
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (
        (table_name = 'users'     AND column_name = 'id')
     OR (table_name = 'cases'     AND column_name IN ('id', 'created_by'))
     OR (table_name = 'expenses'  AND column_name IN ('case_id', 'submitted_by', 'approved_by'))
     OR (table_name = 'documents' AND column_name = 'uploaded_by')
   )
 ORDER BY table_name, column_name;
