# Database Setup Guide

## Required Migration for Notifications

The application uses a notifications system that requires additional columns on the notifications table. If you're getting errors like:

```
column "related_id" of relation "notifications" does not exist
column "related_type" of relation "notifications" does not exist
```

You need to run the migration below.

## How to Apply the Migration

### Method 1: Using Supabase Dashboard (Recommended)

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

Run the following SQL directly in your Supabase SQL Editor:

```sql
-- Add related_id and related_type columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_type VARCHAR(50);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_id 
ON public.notifications(related_id);

CREATE INDEX IF NOT EXISTS idx_notifications_related_type 
ON public.notifications(related_type);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);
```

## Verify the Migration

After running the migration, verify that the columns exist by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

You should see both `related_id` (uuid type) and `related_type` (character varying type) in the results.

## What This Migration Does

1. **Adds `related_id` column** - This allows notifications to be linked to related entities (cases, tasks, documents, etc.) by their UUID
2. **Adds `related_type` column** - This specifies the type of related entity ('task', 'case', 'document', etc.)
3. **Creates indexes** - Improves query performance for filtering and sorting notifications by related entity
4. **Uses IF NOT EXISTS** - Safe to run multiple times without errors

## After Migration

Once applied, you can:
- Create tasks without errors
- Send notifications successfully
- Link notifications to related entities using the `related_id` field

If you continue to see errors after running the migration, make sure:
1. The migration ran successfully (no SQL errors)
2. You're using the correct Supabase project URL and keys
3. The application has been redeployed or the browser cache has been cleared
