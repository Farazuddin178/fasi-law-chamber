# Database Setup Guide - Submission Dates Feature

## Overview
This guide explains how to set up the new `submission_dates` feature in your Supabase database.

## Prerequisites
- Access to Supabase dashboard
- Admin privileges to modify the `cases` table

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query and paste the contents of `supabase_migrations.sql`
4. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to your Supabase account
supabase login

# Apply migrations
supabase migration up
```

## Schema Details

### New Column: `submission_dates`
- **Table**: `cases`
- **Type**: JSONB (JSON array)
- **Default Value**: `[]` (empty array)

### Data Structure

Each submission object has the following fields:

```typescript
interface SubmissionDate {
  submission_number: number;      // Sequential number (1, 2, 3...)
  submission_date: string;        // ISO date format (YYYY-MM-DD)
  submitted_by: string;           // Name/ID of submitter
  due_date: string;              // Due date for submission
  filing_date: string;           // Date case was filed
  resubmission_date: string;     // Date case was resubmitted (if applicable)
  return_date: string;           // Date case was returned
  return_taken_by: string;       // Name/ID of return recipient
  changes_made: string;          // Description of changes made
  changes_requested: string;     // What changes were requested
  changes_requested_by: string;  // Who requested changes
  notes: string;                 // Additional notes
}
```

## Verification

To verify the migration was successful:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT 
  id, 
  case_number, 
  submission_dates,
  created_at
FROM cases 
LIMIT 5;
```

3. You should see the `submission_dates` column with empty arrays `[]` for existing cases

## Example Data

Here's how to insert a sample submission:

```sql
UPDATE cases
SET submission_dates = jsonb_build_array(
  jsonb_build_object(
    'submission_number', 1,
    'submission_date', '2026-01-31',
    'submitted_by', 'John Doe',
    'due_date', '2026-02-07',
    'filing_date', '2026-02-05',
    'resubmission_date', NULL,
    'return_date', NULL,
    'return_taken_by', NULL,
    'changes_made', NULL,
    'changes_requested', NULL,
    'changes_requested_by', NULL,
    'notes', 'Initial submission'
  )
)
WHERE case_number = 'WP 1423/2026';
```

## Troubleshooting

### Issue: Column already exists
**Solution**: The migration includes `IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: Permission denied
**Solution**: Ensure your Supabase account has admin/owner role for the project.

### Issue: Query timeout
**Solution**: If you have many cases, the migration might take longer. Wait for it to complete.

## Rollback (if needed)

To remove the column (not recommended):

```sql
ALTER TABLE cases
DROP COLUMN IF EXISTS submission_dates;
```

## Frontend Integration

The feature is already integrated in the frontend:
- **Form**: `src/pages/CaseFormPage.tsx` - Edit/Create case with submissions
- **View**: `src/pages/CaseDetailsPage.tsx` - Display submissions

No additional frontend changes needed after database setup.

## Support

For questions about:
- **Supabase setup**: Check [Supabase Docs](https://supabase.com/docs)
- **Frontend code**: See the code comments in `CaseFormPage.tsx` and `CaseDetailsPage.tsx`
- **Database schema**: Refer to this document or `supabase_migrations.sql`
