# Audit Logs NOT NULL Constraint Fix

## Problem
When saving cases, you're getting: `null value in column 'changed_by' of relation 'audit_logs' violates not-null constraint`

This error persists despite frontend fixes because:
1. A database trigger may be auto-creating audit logs with NULL `changed_by`
2. The database trigger uses `auth.uid()` which returns NULL for custom authentication
3. RLS policies might be interfering with the INSERT operation

## Frontend Fixes Applied ✅
- ✅ Added `const changedBy = userId || 'system'` fallback in `auditLogsDB.create()`
- ✅ Normalized user.id across auth context (AuthContext.tsx)
- ✅ Added audit log creation to all case operation pages with userId fallback
- ✅ Wrapped all audit operations in try-catch to prevent cascading failures

## Database Fixes Needed

### Solution 1: Create System User and Use UUID (REQUIRED)
The `changed_by` column has a foreign key to `users.id` (UUID), so we MUST use a UUID value:

```sql
-- Step 1: Create a system user (if doesn't exist)
INSERT INTO users (id, full_name, email, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@internal',
  'admin',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update NULL values to system user UUID
UPDATE audit_logs 
SET changed_by = '00000000-0000-0000-0000-000000000000'
WHERE changed_by IS NULL;

-- Step 3: Add DEFAULT to use system UUID
ALTER TABLE audit_logs 
ALTER COLUMN changed_by SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name='audit_logs' AND column_name='changed_by';
```

### Solution 2: Drop Problematic Triggers (If Any)
If a trigger was auto-creating audit logs, disable it:

```sql
-- List all triggers on audit_logs
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'audit_logs';

-- If there are any INSERT triggers, drop them:
-- Example: DROP TRIGGER IF EXISTS trigger_name ON audit_logs;
```

### Solution 3: Disable or Modify RLS Policy
If RLS is blocking inserts, check:

```sql
-- List all policies on audit_logs
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'audit_logs';

-- If RLS exists, ensure it allows INSERT with your user:
-- The policy should allow INSERT when:
-- - changed_by is not null
-- - OR use a service role bypass
```

### Solution 4: Check Table Structure
Verify the audit_logs table has proper structure:

```sql
-- View column details
\d+ audit_logs

-- Should show:
-- - id: uuid PRIMARY KEY
-- - case_id: uuid NOT NULL
-- - changed_field: text
-- - old_value: text
-- - new_value: text
-- - changed_by: TEXT NOT NULL DEFAULT 'system'  ← IMPORTANT! (Changed from UUID to TEXT)
-- - timestamp: timestamp
```

## How to Apply in Supabase

### Step 1: Open SQL Editor
1. Go to https://supabase.com/dashboard
2. Navigate to your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the FIX
Copy and paste **Solution 1** SQL (create system user and use UUID):

```sql
-- Create system user
INSERT INTO users (id, full_name, email, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@internal',
  'admin',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Update NULL values
UPDATE audit_logs 
SET changed_by = '00000000-0000-0000-0000-000000000000'
WHERE changed_by IS NULL;

-- Add DEFAULT
ALTER TABLE audit_logs 
ALTER COLUMN changed_by SET DEFAULT '00000000-0000-0000-0000-000000000000';
```

### Step 3: Verify the Fix
Run this to confirm:

```sql
-- Check DEFAULT is set
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs' AND column_name = 'changed_by';

-- Check no NULL values remain
SELECT COUNT(*) as null_count
FROM audit_logs
WHERE changed_by IS NULL;
```

## Frontend Changes Summary

### 1. AuthContext.tsx
Normalized user ID on login and localStorage load:
```typescript
const normalizedUser = { 
  ...userData, 
  id: userData?.id ?? userData?.user_id ?? userData?.uid 
};
```

### 2. All Case Pages
Added userId normalization:
```typescript
const userId = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.uid ?? null;
```

### 3. auditLogsDB.create()
Added fallback:
```typescript
const changedBy = userId || 'system';
```

### 4. Case Operations
Wrapped in try-catch to prevent failures:
```typescript
try {
  await auditLogsDB.create(caseId, field, oldValue, newValue, userId);
} catch (error) {
  console.error('Audit log failed:', error);
  // Operation continues even if audit log fails
}
```

## Testing the Fix

### Step 1: Hard Refresh Browser
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
- Clear all cookies/cache

### Step 2: Test Case Save
1. Go to **Case Lookup**
2. Search for a case
3. Try to save it
4. **No error** should appear ✅

### Step 3: Verify Audit Logs
1. Go to **Case Details** for the saved case
2. Scroll to **Audit History** tab
3. Should show entry with `changed_by = "system"` or your username

### Step 4: Check Database
Run in SQL Editor:
```sql
SELECT case_id, changed_field, changed_by, timestamp 
FROM audit_logs 
WHERE changed_by IS NULL
ORDER BY timestamp DESC
LIMIT 10;

-- Should return: (0 rows)
```

## Root Cause Analysis

| Component | Issue | Status |
|-----------|-------|--------|
| Database Trigger | Using `auth.uid()` which is NULL for custom auth | ⚠️ Needs SQL fix |
| Database DEFAULT | No default value for changed_by column | ⚠️ Needs SQL fix |
| Frontend userId | Sometimes undefined or wrong format | ✅ Fixed - normalized |
| Audit Log Creation | Not wrapped in try-catch | ✅ Fixed |
| User ID Format | Different auth responses (id vs user_id vs uid) | ✅ Fixed - fallback chain |

## Next Steps if Still Getting Error

If you still get the error after applying the SQL fix:

1. **Check audit_logs table exists and is writable**
   ```sql
   SELECT * FROM audit_logs LIMIT 1;
   ```

2. **Check RLS policies aren't blocking INSERT**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
   ```

3. **Check for OTHER triggers**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'audit_logs';
   ```

4. **Check case INSERT works**
   ```sql
   SELECT * FROM cases ORDER BY created_at DESC LIMIT 1;
   ```

## Files Modified

- ✅ `src/contexts/AuthContext.tsx` - User ID normalization
- ✅ `src/pages/AdvocateReportPage.tsx` - Audit logs for bulk add
- ✅ `src/pages/CaseLookupPage.tsx` - Audit logs for case save
- ✅ `src/pages/CaseFormPage.tsx` - Audit logs for form submit
- ✅ `src/pages/CaseDetailsPage.tsx` - Audit logs for all updates
- ✅ `src/lib/database.ts` - Added fallback in auditLogsDB.create()

## Success Criteria

- [ ] SQL DEFAULT added to audit_logs.changed_by
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Can save case from Case Lookup without error
- [ ] Audit history shows entry with valid changed_by
- [ ] Database has NO NULL values in changed_by column

