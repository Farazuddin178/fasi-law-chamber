-- Case Submission Timeline/History Table
-- Tracks every change and action within a submission for complete audit trail

DROP TABLE IF EXISTS case_submission_history CASCADE;

CREATE TABLE case_submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES case_submissions(id) ON DELETE CASCADE,
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('created', 'file_transferred', 'status_changed', 'changes_requested', 'changes_made', 'reviewed', 'approved', 'completed', 'resubmitted', 'cancelled', 'comment_added')),
  
  -- Action details
  action_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Change details
  previous_status TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL,
  details TEXT DEFAULT NULL,
  
  -- File transfer tracking
  transferred_from UUID REFERENCES users(id) ON DELETE SET NULL,
  transferred_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_submission_history_submission_id ON case_submission_history(submission_id DESC);
CREATE INDEX idx_submission_history_case_id ON case_submission_history(case_id DESC);
CREATE INDEX idx_submission_history_action ON case_submission_history(action);
CREATE INDEX idx_submission_history_action_date ON case_submission_history(action_date DESC);
CREATE INDEX idx_submission_history_action_by ON case_submission_history(action_by);
CREATE INDEX idx_submission_history_submission_action ON case_submission_history(submission_id, action_date DESC);

-- Enable Row Level Security
ALTER TABLE case_submission_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view history for cases they have access to
CREATE POLICY "submission_history_select"
  ON case_submission_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_submission_history.case_id
      AND cases.created_by = auth.uid()
    )
    OR
    -- Users can see actions they performed or actions involving them
    action_by = auth.uid() OR transferred_from = auth.uid() OR transferred_to = auth.uid()
  );

-- RLS Policy: Users can insert history records
CREATE POLICY "submission_history_insert"
  ON case_submission_history
  FOR INSERT
  WITH CHECK (action_by = auth.uid());

-- Add table and column comments
COMMENT ON TABLE case_submission_history IS 'Audit trail for all actions and changes within a case submission';
COMMENT ON COLUMN case_submission_history.action IS 'Type of action: created, file_transferred, status_changed, changes_requested, changes_made, reviewed, approved, completed, resubmitted, cancelled, comment_added';
COMMENT ON COLUMN case_submission_history.action_by IS 'User ID of person performing the action';
COMMENT ON COLUMN case_submission_history.previous_status IS 'Previous status before the action (for status changes)';
COMMENT ON COLUMN case_submission_history.new_status IS 'New status after the action (for status changes)';
COMMENT ON COLUMN case_submission_history.details IS 'Detailed description of the action';
COMMENT ON COLUMN case_submission_history.transferred_from IS 'Original holder of the file (for transfers)';
COMMENT ON COLUMN case_submission_history.transferred_to IS 'New holder of the file (for transfers)';

-- Set up realtime for submission history
ALTER PUBLICATION supabase_realtime ADD TABLE case_submission_history;
