-- Migration: Add missing columns to notifications table
-- Fixes errors like "column related_id does not exist", "column related_type does not exist", "column data does not exist"
-- Created: 2026-01-31

-- Add all missing columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_type VARCHAR(50);

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS data JSONB;

-- Add indexes for better performance
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

-- Drop any existing triggers that cause UUID type errors
-- These might be auto-created by Supabase and try to insert text into UUID columns
DROP TRIGGER IF EXISTS on_task_create ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS on_task_update ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS on_notification_create ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS on_notification_update ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS notify_task_assigned ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS notify_on_task_update ON public.tasks CASCADE;

-- Drop associated functions
DROP FUNCTION IF EXISTS public.handle_task_notification() CASCADE;
DROP FUNCTION IF EXISTS public.handle_task_update_notification() CASCADE;
