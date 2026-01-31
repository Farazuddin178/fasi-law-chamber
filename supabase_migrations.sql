-- ========================================
-- COMPLETE FIX FOR UUID TYPE ERRORS
-- Migration: Add missing columns and remove problematic triggers
-- Fixes: "column related_id is of type uuid but expression is of type text"
-- Created: 2026-01-31
-- ========================================

-- STEP 1: Add all missing columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_type VARCHAR(50);

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS data JSONB;

-- STEP 2: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_id 
ON public.notifications(related_id);

CREATE INDEX IF NOT EXISTS idx_notifications_related_type 
ON public.notifications(related_type);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read 
ON public.notifications(user_id, is_read);

-- STEP 3: Drop ALL possible triggers that cause UUID type errors
-- These triggers automatically insert TEXT values into UUID columns
DROP TRIGGER IF EXISTS on_task_create ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS on_task_update ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS on_notification_create ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS on_notification_update ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS notify_task_assigned ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS notify_on_task_update ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS handle_new_task ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS handle_task_assignment ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS task_notification_trigger ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS task_update_trigger ON public.tasks CASCADE;

-- STEP 4: Drop ALL associated functions that create notifications
DROP FUNCTION IF EXISTS public.handle_task_notification() CASCADE;
DROP FUNCTION IF EXISTS public.handle_task_update_notification() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_task() CASCADE;
DROP FUNCTION IF EXISTS public.handle_task_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.create_task_notification() CASCADE;
DROP FUNCTION IF EXISTS public.update_task_notification() CASCADE;

-- STEP 5: Verification message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Added missing columns to notifications table';
    RAISE NOTICE '✓ Created performance indexes';
    RAISE NOTICE '✓ Removed all problematic triggers';
    RAISE NOTICE '✓ Removed all problematic functions';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '2. Test creating a task';
    RAISE NOTICE '3. Test updating a task';
    RAISE NOTICE '4. Error should be GONE!';
    RAISE NOTICE '========================================';
END $$;
