-- Case Submission Workflow Table
-- Tracks file movements, changes, and return resubmissions for each case
-- Allows recording of who took the file, who gave it, when, and what changes were made/requested

DROP TABLE IF EXISTS case_submissions CASCADE;

CREATE TABLE case_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Submission tracking
  submission_number INT NOT NULL DEFAULT 1,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  return_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'changes_requested', 'resubmitted', 'completed', 'cancelled')),
  
  -- File transfer details
  file_given_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_given_to UUID REFERENCES users(id) ON DELETE SET NULL,
  file_given_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  file_received_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Changes tracking
  changes_made TEXT DEFAULT NULL,
  changes_requested TEXT DEFAULT NULL,
  changes_requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changes_requested_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Additional details
  notes TEXT DEFAULT NULL,
  document_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  
  -- Metadata and timestamps
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_case_submissions_case_id ON case_submissions(case_id DESC);
CREATE INDEX idx_case_submissions_status ON case_submissions(status);
CREATE INDEX idx_case_submissions_file_given_to ON case_submissions(file_given_to);
CREATE INDEX idx_case_submissions_submission_date ON case_submissions(submission_date DESC);
CREATE INDEX idx_case_submissions_due_date ON case_submissions(due_date DESC);
CREATE INDEX idx_case_submissions_return_date ON case_submissions(return_date DESC);
CREATE INDEX idx_case_submissions_case_status ON case_submissions(case_id, status);

-- Enable Row Level Security
ALTER TABLE case_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view submissions for cases they have access to
CREATE POLICY "case_submissions_select"
  ON case_submissions
  FOR SELECT
  USING (
    -- Users can see submissions for cases they created
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_submissions.case_id
      AND cases.created_by = auth.uid()
    )
    OR
    -- Users can see submissions where they gave or received the file
    file_given_by = auth.uid() OR file_given_to = auth.uid()
  );

-- RLS Policy: Users can insert case submissions
CREATE POLICY "case_submissions_insert"
  ON case_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Users can update submissions they created
CREATE POLICY "case_submissions_update"
  ON case_submissions
  FOR UPDATE
  USING (auth.uid() = created_by OR file_given_to = auth.uid());

-- RLS Policy: Users can delete submissions they created
CREATE POLICY "case_submissions_delete"
  ON case_submissions
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add table and column comments
COMMENT ON TABLE case_submissions IS 'Tracks case file submissions, transfers, changes requested, and resubmissions';
COMMENT ON COLUMN case_submissions.submission_number IS 'Sequential submission number for tracking multiple submissions of same case';
COMMENT ON COLUMN case_submissions.submission_date IS 'Date when the case file was initially submitted';
COMMENT ON COLUMN case_submissions.due_date IS 'Expected return/completion date for the case';
COMMENT ON COLUMN case_submissions.return_date IS 'Actual date when the case file was returned or completed';
COMMENT ON COLUMN case_submissions.status IS 'Current status: pending, submitted, under_review, changes_requested, resubmitted, completed, cancelled';
COMMENT ON COLUMN case_submissions.file_given_by IS 'User ID of person who gave the case file';
COMMENT ON COLUMN case_submissions.file_given_to IS 'User ID of person who received the case file';
COMMENT ON COLUMN case_submissions.file_given_date IS 'Date and time when file was handed over';
COMMENT ON COLUMN case_submissions.file_received_date IS 'Date and time when file was received';
COMMENT ON COLUMN case_submissions.changes_made IS 'Description of changes made to the case';
COMMENT ON COLUMN case_submissions.changes_requested IS 'Description of changes/modifications requested';
COMMENT ON COLUMN case_submissions.changes_requested_by IS 'User ID of person who requested changes';
COMMENT ON COLUMN case_submissions.changes_requested_date IS 'Date when changes were requested';
COMMENT ON COLUMN case_submissions.document_url IS 'URL to uploaded document/file';
COMMENT ON COLUMN case_submissions.file_name IS 'Name of the submitted file';

-- Set up realtime for case submissions
ALTER PUBLICATION supabase_realtime ADD TABLE case_submissions;
