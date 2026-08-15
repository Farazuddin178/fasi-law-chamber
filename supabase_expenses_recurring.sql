-- ================================================================
-- RUN ONCE in Supabase Dashboard -> SQL Editor.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.
--
-- Adds recurring-expense support to the expenses table. Without these two
-- columns the Expenses page still loads, but saving an expense fails with
-- "Could not find the 'is_recurring' column of 'expenses' in the schema cache".
-- ================================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

-- 'monthly' | 'quarterly' | 'yearly'. NULL for one-off expenses.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurrence_interval text;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_recurrence_interval_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_recurrence_interval_check
  CHECK (recurrence_interval IS NULL
         OR recurrence_interval IN ('monthly', 'quarterly', 'yearly'));

-- The page scans for recurring rows that are due; index them.
CREATE INDEX IF NOT EXISTS idx_expenses_is_recurring
  ON public.expenses (is_recurring) WHERE is_recurring;

-- The date-range filter and per-case rollup both sort/group on these.
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
  ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_case_id
  ON public.expenses (case_id) WHERE case_id IS NOT NULL;

ANALYZE public.expenses;

-- Clear PostgREST's cached schema so the new columns are visible immediately.
NOTIFY pgrst, 'reload schema';
