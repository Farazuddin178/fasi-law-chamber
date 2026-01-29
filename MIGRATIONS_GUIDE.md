# Database Migrations Guide

## Overview
This guide covers three critical database migrations needed for the case management system:
1. **Notifications Table** - System-wide notifications
2. **Case Submissions Table** - File transfer and submission tracking
3. **Case Submission History Table** - Complete audit trail

---

## Migration 1: Notifications Table (001_create_notifications_table.sql)

### Purpose
Stores all system notifications for users including task assignments, announcements, sitting arrangement changes, and general updates.

### Key Features
- User-specific notifications with read/unread status
- Priority levels (low, medium, high, urgent)
- Type categorization (task, announcement, sitting_arrangement, general)
- Real-time synchronization via Supabase Realtime
- Row-level security for user privacy

### Columns
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to auth.users |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification message |
| `type` | TEXT | task \| announcement \| sitting_arrangement \| general |
| `priority` | TEXT | low \| medium \| high \| urgent |
| `metadata` | JSONB | Additional data (links, case IDs, etc.) |
| `is_read` | BOOLEAN | Read status (default: false) |
| `read_at` | TIMESTAMP | When user marked as read |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Indexes Created
- `idx_notifications_user_id` - Fast user lookups
- `idx_notifications_is_read` - Filter unread notifications
- `idx_notifications_created_at` - Sort by date
- `idx_notifications_user_unread` - Find unread for user

### RLS Policies
✅ Users see only their own notifications
✅ Users can update their own notifications
✅ System can insert notifications for all users

---

## Migration 2: Case Submissions Table (002_create_case_submissions_table.sql)

### Purpose
Tracks case file movements, submissions, changes requested, and resubmissions. Implements the complete workflow for:
- Recording who gave the file and to whom
- Tracking submission dates and due dates
- Recording changes made and changes requested
- Managing submission status with date/repeat structure

### Key Features
- Sequential submission numbers for repeat submissions
- File transfer tracking (from/to user with dates)
- Changes tracking (made and requested)
- Status management for complete workflow
- Document URL storage for uploaded files
- Real-time updates

### Columns
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `case_id` | UUID | Reference to cases table |
| `submission_number` | INT | 1st, 2nd, 3rd submission, etc. |
| `submission_date` | TIMESTAMP | Date submission created |
| `due_date` | TIMESTAMP | Expected return date |
| `return_date` | TIMESTAMP | Actual completion date |
| `status` | TEXT | pending \| submitted \| under_review \| changes_requested \| resubmitted \| completed \| cancelled |
| `file_given_by` | UUID | User who gave the file |
| `file_given_to` | UUID | User who received the file |
| `file_given_date` | TIMESTAMP | Date file was transferred |
| `file_received_date` | TIMESTAMP | Date file was received |
| `changes_made` | TEXT | Description of changes made |
| `changes_requested` | TEXT | Description of requested changes |
| `changes_requested_by` | UUID | User who requested changes |
| `changes_requested_date` | TIMESTAMP | When changes were requested |
| `notes` | TEXT | Additional notes |
| `document_url` | TEXT | URL to submitted document |
| `file_name` | TEXT | Name of submitted file |
| `metadata` | JSONB | Additional custom data |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `created_by` | UUID | User who created submission |

### Status Workflow
```
pending 
  ↓
submitted
  ↓
under_review
  ├→ changes_requested → resubmitted → under_review → ...
  └→ completed
  
Alternative: cancelled
```

### Example Usage Scenarios

**Scenario 1: Simple Submission**
```
submission_number: 1
status: pending → submitted → completed
file_given_to: [Advocate User]
changes_made: "Updated prayer section with new claims"
document_url: "https://storage.url/case_123_v1.pdf"
return_date: "2026-02-15"
```

**Scenario 2: Submission with Changes Requested**
```
submission_number: 1
status: submitted → under_review → changes_requested
changes_requested: "Update respondent details, add missing judge name"
changes_requested_by: [Admin User]
changes_requested_date: "2026-02-10"

[Time passes, advocate makes changes]

submission_number: 2 (or same submission number with updated status)
status: resubmitted → under_review → completed
changes_made: "Updated respondent details as per comments"
document_url: "https://storage.url/case_123_v2.pdf"
```

**Scenario 3: Multiple Resubmissions**
```
Submission 1: pending → submitted → changes_requested
Submission 2: pending → submitted → changes_requested  
Submission 3: pending → submitted → completed

Each tracked with different submission_number
```

### Indexes Created
- `idx_case_submissions_case_id` - Find submissions for a case
- `idx_case_submissions_status` - Filter by status
- `idx_case_submissions_file_given_to` - Find files assigned to user
- `idx_case_submissions_submission_date` - Sort by date
- `idx_case_submissions_due_date` - Find overdue submissions
- `idx_case_submissions_return_date` - Track completion
- `idx_case_submissions_case_status` - Combined lookups

### RLS Policies
✅ Users see submissions for cases they created/are assigned to
✅ Users see submissions where they gave/received the file
✅ Users can create submissions
✅ Creators and receivers can update submissions
✅ Creators can delete submissions

---

## Migration 3: Case Submission History (003_create_case_submission_history.sql)

### Purpose
Complete audit trail for all actions within a submission. Every change is recorded for compliance and tracking.

### Key Features
- Immutable history (insert-only table)
- Tracks every action type
- Records who performed action and when
- Captures status transitions
- Logs file transfers with from/to users
- Stores detailed change descriptions
- Real-time updates for notifications

### Columns
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `submission_id` | UUID | Reference to case_submissions |
| `case_id` | UUID | Reference to cases |
| `action` | TEXT | created \| file_transferred \| status_changed \| changes_requested \| changes_made \| reviewed \| approved \| completed \| resubmitted \| cancelled \| comment_added |
| `action_by` | UUID | User performing action |
| `action_date` | TIMESTAMP | When action occurred |
| `previous_status` | TEXT | Status before change |
| `new_status` | TEXT | Status after change |
| `details` | TEXT | Detailed description |
| `transferred_from` | UUID | Original file holder |
| `transferred_to` | UUID | New file holder |
| `metadata` | JSONB | Additional data |
| `created_at` | TIMESTAMP | Record creation time |

### Example History Sequence
```
ACTION 1: created
- action_by: User123 (advocate)
- details: "Case 2024-001 submitted"
- new_status: "pending"
- action_date: 2026-02-01 10:00

ACTION 2: file_transferred
- action_by: User123
- transferred_from: User123
- transferred_to: User456 (admin)
- details: "File handed to admin for review"
- action_date: 2026-02-01 14:30

ACTION 3: status_changed
- action_by: User456
- previous_status: "pending"
- new_status: "under_review"
- action_date: 2026-02-02 09:00

ACTION 4: changes_requested
- action_by: User456
- details: "Update respondent details and add missing order references"
- action_date: 2026-02-05 16:20

ACTION 5: changes_made
- action_by: User123
- details: "Added missing judge names and updated respondent contact info"
- action_date: 2026-02-08 11:15

ACTION 6: file_transferred
- action_by: User123
- transferred_from: User123
- transferred_to: User456
- details: "Resubmitted case with requested changes"
- action_date: 2026-02-08 14:00

ACTION 7: approved
- action_by: User456
- action_date: 2026-02-10 10:00

ACTION 8: completed
- action_by: User456
- previous_status: "under_review"
- new_status: "completed"
- action_date: 2026-02-10 10:05
```

### Indexes Created
- `idx_submission_history_submission_id` - Find history for submission
- `idx_submission_history_case_id` - Find all actions for case
- `idx_submission_history_action` - Filter by action type
- `idx_submission_history_action_date` - Sort chronologically
- `idx_submission_history_action_by` - Find actions by user
- `idx_submission_history_submission_action` - Combined lookups

### RLS Policies
✅ Users see history for cases they have access to
✅ Users see actions they performed
✅ Users see actions involving them (transfers)
✅ Users can insert history records

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for First Time)

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `001_create_notifications_table.sql`
4. Click **Run**
5. Verify success (no error messages)
6. Repeat for `002_create_case_submissions_table.sql`
7. Repeat for `003_create_case_submission_history.sql`

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase migration up
```

### Option 3: Verifying Migrations in Dashboard

After running migrations, verify in Supabase Dashboard:

1. Go to **Table Editor**
2. Should see these new tables:
   - `notifications`
   - `case_submissions`
   - `case_submission_history`
3. Click on each table to verify columns match schema above

---

## Integration with Frontend

### Notifications Usage

```typescript
// In your frontend code
const notificationManager = {
  async send(userId: string, title: string, message: string, type: string, priority: string) {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      priority,
      is_read: false
    });
  }
};
```

### Case Submissions Usage

```typescript
// Create submission
const submission = await supabase.from('case_submissions').insert({
  case_id: caseId,
  submission_number: 1,
  status: 'pending',
  file_given_to: targetUserId,
  due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString()
}).single();

// Update with changes requested
await supabase.from('case_submissions')
  .update({
    status: 'changes_requested',
    changes_requested: 'Update prayer section',
    changes_requested_by: currentUserId,
    changes_requested_date: new Date().toISOString()
  })
  .eq('id', submissionId);
```

### Submission History Usage

```typescript
// Log action
await supabase.from('case_submission_history').insert({
  submission_id: submissionId,
  case_id: caseId,
  action: 'changes_requested',
  action_by: currentUserId,
  details: 'Update prayer section and respondent details',
  new_status: 'changes_requested'
});
```

---

## Troubleshooting

### Error: "column does not exist"
**Solution:** Ensure you've run all migrations in order. Check Supabase Table Editor to verify tables exist.

### Error: "permission denied"
**Solution:** Check that RLS policies are created correctly. Run migrations again from beginning.

### Realtime not working
**Solution:** Verify `ALTER PUBLICATION supabase_realtime ADD TABLE` commands were executed. Check Supabase Realtime settings.

### Performance Issues
**Solution:** Verify all indexes were created. Run:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'case_submissions';
```

---

## Next Steps

1. ✅ Run these three migrations in Supabase
2. Create frontend components for:
   - Case Submission Form (create/update submissions)
   - Submission History Timeline (view all actions)
   - File Transfer Dialog (assign file to user)
   - Changes Request Dialog (request changes from user)
3. Integrate with notification system
4. Add real-time listeners for submissions updates
5. Create reports showing submission metrics

---

## Support

For issues or questions about the schema:
- Check Supabase documentation: https://supabase.com/docs
- Review RLS policies if queries return no data
- Verify auth.uid() is working correctly
- Check browser console for detailed error messages
