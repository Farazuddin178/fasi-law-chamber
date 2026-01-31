-- Migration: Add related_id column to notifications table
-- This fixes the "column related_id of relation notifications does not exist" error
-- Created: 2026-01-31

-- Add related_id column to notifications table if it doesn't exist
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

-- Add index on related_id for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_id 
ON public.notifications(related_id);

-- Add index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

-- Add index on created_at for better sorting performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);
