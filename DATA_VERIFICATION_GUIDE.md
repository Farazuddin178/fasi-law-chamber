# ✅ Data Verification Guide

## Quick SQL Queries to Check Database Storage

Run these in your **Supabase SQL Editor** to verify data is being stored.

---

## 1️⃣ Check Cases Table

```sql
-- See all cases
SELECT id, case_number, flc_number, client_name, status, created_at 
FROM cases 
ORDER BY created_at DESC 
LIMIT 10;

-- Count total cases
SELECT COUNT(*) as total_cases FROM cases;

-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;
```

---

## 2️⃣ Check Tasks Table

```sql
-- See all tasks
SELECT id, title, assigned_to, status, priority, created_at 
FROM tasks 
ORDER BY created_at DESC 
LIMIT 10;

-- Count total tasks
SELECT COUNT(*) as total_tasks FROM tasks;

-- Check task columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
```

---

## 3️⃣ Check Announcements Table

```sql
-- See all announcements
SELECT id, title, visible_to, created_by, created_at 
FROM announcements 
ORDER BY created_at DESC;

-- Count announcements
SELECT COUNT(*) as total_announcements FROM announcements;

-- Check if table exists
SELECT * FROM announcements LIMIT 1;
```

---

## 4️⃣ Check Task Responses Table

```sql
-- See all task responses
SELECT id, task_id, user_id, status, reason, created_at 
FROM task_responses 
ORDER BY created_at DESC;

-- Count task responses
SELECT COUNT(*) as total_responses FROM task_responses;

-- Check if table exists
SELECT * FROM task_responses LIMIT 1;
```

---

## 5️⃣ Check Activity Logs Table

```sql
-- See all activity logs
SELECT id, user_id, action, entity_type, entity_name, created_at 
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Count activity logs
SELECT COUNT(*) as total_logs FROM activity_logs;

-- Check if table exists
SELECT * FROM activity_logs LIMIT 1;
```

---

## 6️⃣ Verify All Data is Storing Correctly

```sql
-- Get comprehensive status
SELECT 
  (SELECT COUNT(*) FROM cases) as total_cases,
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM announcements) as total_announcements,
  (SELECT COUNT(*) FROM task_responses) as total_task_responses,
  (SELECT COUNT(*) FROM activity_logs) as total_activity_logs;
```

---

## What To Expect

### After Creating a Case:
- ✅ New row appears in `cases` table
- ✅ `case_number` or `flc_number` is filled
- ✅ `status` shows as 'pending'
- ✅ `created_by` has your user ID
- ✅ `created_at` shows current timestamp

### After Creating a Task:
- ✅ New row appears in `tasks` table
- ✅ `title` is populated
- ✅ `status` shows as 'pending'
- ✅ `priority` shows as 'medium'
- ✅ `created_by` has your user ID

### After Creating an Announcement (Admin):
- ✅ New row appears in `announcements` table
- ✅ `title` and `content` are filled
- ✅ `visible_to` is 'all_users' or 'restricted_admins_only'
- ✅ `created_by` has your admin user ID

### After Task Response (Accept/Pass-on):
- ✅ New row appears in `task_responses` table
- ✅ `task_id` references the task
- ✅ `status` is 'accepted' or 'passed_on'
- ✅ `reason` has the pass-on reason (if applicable)

---

## Troubleshooting

### ❌ "Table does not exist" error
**Solution:** You haven't run the SQL setup yet
- Go to `SUPABASE_SQL_ONLY.md`
- Execute all SQL commands in order
- Then try the queries again

### ❌ No data appearing
**Solution:** Check your app is actually creating records
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Try creating a case/task again
5. Watch for success toast messages

### ❌ Columns missing
**Solution:** Required SQL setup hasn't been executed
- New columns like `flc_number`, `client_name`, etc. won't exist
- Run SQL setup from `SUPABASE_SQL_ONLY.md`

---

## How to Run These Queries

1. **Open Supabase Dashboard**
2. **Click your Project**
3. **Left sidebar → SQL Editor**
4. **Click "New Query"**
5. **Paste one query above**
6. **Click "Run" button**
7. **See results below**

---

## Expected Data Flow

```
User Action          →  App Sends Data  →  Database Stores  →  Query Shows It
─────────────────────────────────────────────────────────────────────────────
Create Case          →  INSERT cases    →  cases table     →  SELECT shows it
Create Task          →  INSERT tasks    →  tasks table     →  SELECT shows it
Create Announcement  →  INSERT announce →  announce table  →  SELECT shows it
Accept/Pass Task     →  INSERT response →  response table  →  SELECT shows it
```

---

## Summary

Everything should be storing correctly if:
- ✅ You see success toast messages in the app
- ✅ The queries above return results
- ✅ The data matches what you entered

If queries return no data, check:
1. Did SQL setup run? (check announcements table first - it's new)
2. Did you create any records? (check Cases count)
3. Are there any browser console errors? (F12 → Console)

---

**Run these SQL queries to verify everything is working! ✅**
