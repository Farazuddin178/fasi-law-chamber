# Final Setup Steps

## 1. ✅ Firebase Config Added
Your Firebase credentials are now in `.env.local`

## 2. ⚠️ IMPORTANT: Get VAPID Key
See [GET_VAPID_KEY.md](GET_VAPID_KEY.md) for instructions
- Go to Firebase Console → Cloud Messaging
- Generate & copy Public Key
- Update `.env.local` with `VITE_FIREBASE_VAPID_KEY`

## 3. 🗄️ Create FCM Table in Supabase
Open Supabase SQL Editor and run:

```sql
-- Create FCM tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY fcm_tokens_select ON fcm_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY fcm_tokens_insert ON fcm_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY fcm_tokens_delete ON fcm_tokens
  FOR DELETE USING (auth.uid() = user_id);
```

## 4. 🚀 Restart App
```bash
pnpm run dev
```

## 5. ✨ Test It!
- **Login to app** → Browser asks for notification permission → **Allow**
- **Create a task** and assign to someone
- **That user gets instant notification** 📱

## How It Works Now:
✅ Task assigned → Instant browser notification
✅ Announcement created → Real-time alert
✅ Status changes → Users notified
✅ Works on all devices & tabs
✅ Completely free (Firebase free tier!)
