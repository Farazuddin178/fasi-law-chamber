# Database and Form Fixes - Implementation Instructions

## Issues Fixed

### 1. Database Tables Missing (task_responses, task_comments)
**Problem:** Clicking on "Accept" or "Pass On" buttons resulted in errors because the tables didn't exist.

**Solution:** Run the SQL script `DATABASE_FIX.sql` in your Supabase SQL Editor.

### 2. Foreign Key Constraint Error
**Problem:** `task_comments_user_id_fkey` constraint violation when adding comments.

**Solution:** The SQL script creates proper foreign key relationships and RLS policies.

### 3. Missing Form Fields
**Problem:** Case details view showed fields (IA Details, USR Details, etc.) that weren't in the case form.

**Solution:** Added all missing fields to the case form page.

## Steps to Fix

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the entire contents of `DATABASE_FIX.sql`
4. Paste and run the SQL script
5. Verify tables are created:
   - `task_comments`
   - `task_responses`
6. Verify new columns added to `cases` table:
   - `ia_details` (JSONB array)
   - `usr_details` (JSONB array)
   - `connected_matters` (TEXT)
   - `vakalath_details` (JSONB array)
   - `lower_court_details` (JSONB object)
   - `petitioners` (JSONB array)
   - `respondents` (JSONB array)
   - `orders` (JSONB array)

### Step 2: Test the Application

#### Test Accept/Pass On Functionality:
1. Log in as a user with assigned tasks
2. Go to Dashboard
3. Click "Accept" on a task - should work without errors
4. Click "Pass On" on a task, provide a reason - should work without errors
5. Verify task status changes correctly

#### Test Case Form:
1. Go to Cases → New Case
2. Scroll down to see new sections:
   - IA DETAILS
   - USR Details
   - CONNECTED MATTERS
   - VAKALATH
   - LOWER COURT DETAILS
   - PETITIONER(S)
   - RESPONDENT(S)
   - ORDERS
3. Add entries to each section using the "+ Add" buttons
4. Save the case
5. View the case details to verify all data is saved

### Step 3: Commit and Deploy

```bash
git add .
git commit -m "Add missing database tables and case form fields"
git push
```

Then deploy to your hosting platform (Netlify/Vercel).

## New Features Added

### 1. Task Response Tracking
- All accept/pass on actions are now logged in `task_responses` table
- Response type, reason, and timestamp are recorded
- Admins can track who accepted or passed on tasks

### 2. Complete Case Form
The case form now includes ALL fields shown in the court system:

#### IA Details
- IA Number, Filing Date, Advocate Name
- Misc Paper Type, Status, Prayer
- Order Date, Order

#### USR Details  
- USR Number, Advocate Name, USR Type
- USR Filing Date, Remarks

#### Connected Matters
- Connected case number reference

#### Vakalath
- Advocate Code, Advocate Name, P/R No
- Remarks, File URL for document links

#### Lower Court Details
- Court Name, District, Lower Court Case No
- Hon'ble Judge, Date of Judgement

#### Petitioners
- Serial Number, Name
- Add multiple petitioners

#### Respondents
- R.No, Name
- Add multiple respondents

#### Orders
- Order On, Judge Name, Date
- Type, Details, File URL for PDF links

## Testing Checklist

- [ ] Run DATABASE_FIX.sql successfully
- [ ] Accept button works without errors
- [ ] Pass On button works with reason prompt
- [ ] Comments can be sent without foreign key errors
- [ ] New case form shows all new sections
- [ ] Can add multiple IA details
- [ ] Can add multiple USR details
- [ ] Can add petitioners and respondents
- [ ] Can add orders with PDF links
- [ ] Lower court details save correctly
- [ ] Case details view displays all new data
- [ ] Edit existing case preserves all data

## Troubleshooting

### If Accept/Pass On still shows errors:
1. Verify `task_responses` table exists: 
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'task_responses';
   ```
2. Check RLS policies are enabled
3. Verify user_id is being passed correctly (check browser console)

### If form fields don't save:
1. Verify columns exist in `cases` table:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'cases' 
   AND column_name IN ('ia_details', 'usr_details', 'petitioners', 'respondents', 'orders');
   ```
2. Check browser console for JSONB formatting errors
3. Ensure you're passing arrays/objects in correct format

### If foreign key errors persist:
1. Check if the user exists in auth.users table
2. Verify the task_id exists in tasks table
3. Check RLS policies allow the INSERT operation

## Data Structure Reference

### IA Details (JSONB Array)
```json
[
  {
    "ia_number": "IA 123/2026",
    "filing_date": "2026-01-15",
    "advocate_name": "John Doe",
    "misc_paper_type": "Application",
    "status": "Pending",
    "prayer": "Prayer details",
    "order_date": "2026-01-20",
    "order": "Order details"
  }
]
```

### Lower Court Details (JSONB Object)
```json
{
  "court_name": "District Court",
  "district": "Central",
  "lower_court_case_no": "CC 123/2025",
  "honorable_judge": "Hon'ble Judge Name",
  "date_of_judgement": "2025-12-15"
}
```

### Petitioners/Respondents (JSONB Array)
```json
[
  { "s_no": 1, "name": "Petitioner Name" },
  { "r_no": 1, "name": "Respondent Name" }
]
```

## Notes

- All new fields are optional - case can be saved without filling them
- JSONB arrays allow unlimited entries per section
- File URLs in Vakalath and Orders can link to Supabase Storage or external URLs
- The form automatically populates existing data when editing a case
- Data is preserved in case details view (read-only mode)
