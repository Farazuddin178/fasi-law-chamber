# Database Setup Guide

## Required Migration for Notifications

The application uses a notifications system that requires the `related_id` column on the notifications table. If you're getting the error:

```
column "related_id" of relation "notifications" does not exist
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
-- Add related_id column to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_id 
ON public.notifications(related_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);
```

## Verify the Migration

After running the migration, verify that the column exists by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications';
```

You should see `related_id` in the results with type `uuid`.

## What This Migration Does

1. **Adds `related_id` column** - This allows notifications to be linked to related entities (cases, tasks, documents, etc.)
2. **Creates indexes** - Improves query performance for filtering and sorting notifications
3. **Uses IF NOT EXISTS** - Safe to run multiple times without errors

## After Migration

Once applied, you can:
- Create tasks without errors
- Send notifications successfully
- Link notifications to related entities using the `related_id` field

If you continue to see errors after running the migration, make sure:
1. The migration ran successfully (no SQL errors)
2. You're using the correct Supabase project URL and keys
3. The application has been redeployed or the browser cache has been cleared
