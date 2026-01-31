# Database Setup Guide

## Required Migration for Notifications

The application uses a notifications system that requires additional columns on the notifications table. If you're getting ANY of these errors:

```
column "related_id" of relation "notifications" does not exist
column "related_type" of relation "notifications" does not exist
column "data" of relation "notifications" does not exist
```

You MUST run the complete migration below to fix all issues at once.

## How to Apply the Migration

### Method 1: Using Supabase Dashboard (Recommended) ⭐

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `supabase_migrations.sql` from this repository
6. Click **Run**
7. You should see: `executed successfully`

### Method 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Apply migration
supabase migration up
```

### Method 3: Manual SQL Execution

Copy and paste ALL of this SQL directly in your Supabase SQL Editor:

```sql
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
```

## Verify the Migration

After running the migration, verify that ALL columns exist by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

You should see:
- `related_id` (uuid type)
- `related_type` (character varying type)
- `data` (jsonb type)

## What This Migration Does

1. **Adds `related_id` column** - Links notifications to related entities (tasks, cases, documents) by their UUID
2. **Adds `related_type` column** - Specifies the type of related entity ('task', 'case', 'document', etc.)
3. **Adds `data` column** - Stores additional JSON data for notifications
4. **Creates indexes** - Improves query performance for filtering and sorting notifications
5. **Uses IF NOT EXISTS** - Safe to run multiple times without errors

## After Migration Complete

1. **Reload your app** (hard refresh with Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** if errors persist
3. Try creating a task again - it should work without any column errors!

## If You Still Get Errors

This means one of these things:
1. The migration didn't run successfully (check for SQL errors)
2. You're looking at a cached version of the app
3. The Supabase project isn't configured properly

**Solution:**
- Run the SQL again and confirm it says `executed successfully`
- Hard refresh your browser (Ctrl+Shift+R)
- Check the Supabase dashboard that you're on the correct project

## Need Help?

If errors persist after running the migration:
1. Check that you're on the correct Supabase project
2. Verify all three columns were added (run the verification SQL above)
3. Clear your browser cache and reload
4. If still stuck, check the Supabase logs for any trigger/function errors
