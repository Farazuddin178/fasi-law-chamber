-- Clean notifications table creation with proper schema
-- Drop old migration files' resources if they exist
DROP TABLE IF EXISTS notifications CASCADE;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_user_unread;

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'announcement', 'sitting_arrangement', 'general')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  metadata JSONB DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Allow insert for authenticated users (service role bypass via app)
CREATE POLICY "notifications_insert"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Add table comments
COMMENT ON TABLE notifications IS 'Stores all system notifications for users (tasks, announcements, updates)';
COMMENT ON COLUMN notifications.type IS 'Type of notification: task, announcement, sitting_arrangement, or general';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high, or urgent';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read by user';
COMMENT ON COLUMN notifications.metadata IS 'Additional data specific to notification type (JSON)';

-- Set up realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
