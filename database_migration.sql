-- ============================================================================
-- NOTIFICATION SYSTEM DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add phone columns to users table for notifications
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30);

-- 2. Create audit_logs table for tracking case changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES cases(id) ON DELETE CASCADE,
  changed_field VARCHAR(255) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 3. Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  notification_type VARCHAR(50),
  channel VARCHAR(20),
  status VARCHAR(20),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create hearings table if it doesn't exist (for daily reminders)
CREATE TABLE IF NOT EXISTS hearings (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES cases(id) ON DELETE CASCADE,
  hearing_date DATE NOT NULL,
  hearing_court VARCHAR(255),
  judge_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add decline_reason to tasks table (for task rejection tracking)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- 6. Enable Row Level Security (RLS) on new tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for audit_logs
CREATE POLICY IF NOT EXISTS "audit_logs_select_policy" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "audit_logs_insert_policy" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. Create RLS policies for notification_logs
CREATE POLICY IF NOT EXISTS "notification_logs_select_policy" ON notification_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "notification_logs_insert_policy" ON notification_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 9. Create RLS policies for hearings
CREATE POLICY IF NOT EXISTS "hearings_select_policy" ON hearings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "hearings_insert_policy" ON hearings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "hearings_update_policy" ON hearings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "hearings_delete_policy" ON hearings
  FOR DELETE USING (auth.role() = 'authenticated');

-- 10. Create trigger function for tracking case changes (audit log)
CREATE OR REPLACE FUNCTION track_case_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track field changes
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO audit_logs (case_id, changed_field, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.updated_by);
    END IF;
    
    IF OLD.case_stage != NEW.case_stage THEN
      INSERT INTO audit_logs (case_id, changed_field, old_value, new_value, changed_by)
      VALUES (NEW.id, 'case_stage', OLD.case_stage, NEW.case_stage, NEW.updated_by);
    END IF;
    
    IF OLD.listing_date != NEW.listing_date THEN
      INSERT INTO audit_logs (case_id, changed_field, old_value, new_value, changed_by)
      VALUES (NEW.id, 'listing_date', 
              COALESCE(OLD.listing_date::TEXT, 'NULL'), 
              COALESCE(NEW.listing_date::TEXT, 'NULL'), 
              NEW.updated_by);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger on cases table
DROP TRIGGER IF EXISTS cases_audit_trigger ON cases;
CREATE TRIGGER cases_audit_trigger
  AFTER UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION track_case_changes();

-- 12. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp_number);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration success)
-- ============================================================================

-- Check if phone columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('phone', 'whatsapp_number');

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_logs', 'notification_logs', 'hearings');

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('audit_logs', 'notification_logs', 'hearings', 'users')
ORDER BY tablename, indexname;
