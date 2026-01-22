-- Create FCM tokens table to store notification tokens per user
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own tokens
CREATE POLICY fcm_tokens_select ON fcm_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY fcm_tokens_insert ON fcm_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY fcm_tokens_delete ON fcm_tokens
  FOR DELETE USING (auth.uid() = user_id);
