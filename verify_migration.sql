-- ========================================
-- VERIFICATION SCRIPT
-- Run this AFTER running supabase_migrations.sql
-- ========================================

-- 1. Check that all required columns exist in notifications table
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name IN ('related_id', 'related_type', 'data') THEN '✓ REQUIRED COLUMN'
        ELSE ''
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Check for any remaining triggers on tasks table (should be EMPTY)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    '❌ THIS TRIGGER MUST BE REMOVED!' as warning
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'tasks';

-- 3. Check for any remaining triggers on notifications table (should be EMPTY)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    '❌ THIS TRIGGER MUST BE REMOVED!' as warning
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'notifications';

-- 4. Check for any functions that might create notifications (should be EMPTY or only safe ones)
SELECT 
    routine_name,
    routine_type,
    '⚠️ CHECK THIS FUNCTION' as warning
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%task%notification%' OR
    routine_name LIKE '%handle_task%' OR
    routine_name LIKE '%notify_task%'
  );

-- 5. Verify indexes were created
SELECT 
    indexname,
    tablename,
    indexdef,
    '✓ PERFORMANCE INDEX' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'notifications'
  AND indexname LIKE 'idx_notifications_%';

-- EXPECTED RESULTS:
-- Query 1: Should show related_id (uuid), related_type (character varying), data (jsonb)
-- Query 2: Should return NO rows (no triggers on tasks)
-- Query 3: Should return NO rows (no triggers on notifications)
-- Query 4: Should return NO rows (no problematic functions)
-- Query 5: Should show 6 indexes created

-- If everything looks good, you'll see success message below:
DO $$
DECLARE
    trigger_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Count triggers on tasks table
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'tasks';
    
    -- Count required columns in notifications table
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name IN ('related_id', 'related_type', 'data');
    
    IF trigger_count = 0 AND column_count = 3 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓✓✓ VERIFICATION SUCCESSFUL! ✓✓✓';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'All columns exist: %', column_count;
        RAISE NOTICE 'No problematic triggers: %', trigger_count;
        RAISE NOTICE '';
        RAISE NOTICE 'YOU CAN NOW USE THE APPLICATION!';
        RAISE NOTICE 'Go test creating and updating tasks.';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING '========================================';
        RAISE WARNING '❌ VERIFICATION FAILED!';
        RAISE WARNING '========================================';
        RAISE WARNING 'Required columns found: % (expected: 3)', column_count;
        RAISE WARNING 'Triggers still exist: % (expected: 0)', trigger_count;
        RAISE WARNING '';
        RAISE WARNING 'Please re-run supabase_migrations.sql';
        RAISE WARNING '========================================';
    END IF;
END $$;
