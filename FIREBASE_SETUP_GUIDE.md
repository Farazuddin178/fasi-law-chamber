# Firebase Cloud Messaging Setup for Notifications

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "fasi-law-chamber" → Create project
4. Select "Web" platform

## Step 2: Get Firebase Config
1. In Project Settings → General tab
2. Scroll to "Your apps" section
3. Copy the config object with API keys

## Step 3: Set Environment Variables
Add to `.env.local`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

## Step 4: Get VAPID Key
1. In Firebase Console → Project Settings → Cloud Messaging tab
2. Click "Generate Key Pair" under Web Push certificates
3. Copy the public key and paste as `VITE_FIREBASE_VAPID_KEY`

## Step 5: Update Service Worker Config
Edit `public/firebase-messaging-sw.js` and replace the Firebase config with your actual values.

## Step 6: Run SQL to create FCM table
Open Supabase SQL Editor and run:
```sql
-- See SETUP_FCM_TABLE.sql
```

## Step 7: Install Firebase Package
```bash
pnpm add firebase
```

## How It Works
- When user logs in → requests notification permission
- Gets FCM token → stored in database
- When task assigned → send notification to all user's devices
- User sees real-time browser notification

## Send Notification (from backend/admin)
```bash
curl -X POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "{FCM_TOKEN}",
      "notification": {
        "title": "Task Assigned",
        "body": "You have been assigned: Task Title"
      }
    }
  }'
```

Or use Supabase Edge Functions to automate this.
