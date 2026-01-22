# Getting Firebase Cloud Messaging VAPID Key

Your Firebase Project is ready! Now you need the VAPID key for push notifications.

## Steps to Get VAPID Key:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: "fasi-law-chamber"
3. **Click Settings** ⚙️ (top left) → **Project Settings**
4. **Go to Cloud Messaging tab**
5. **Under "Web Push certificates"** → Click **"Generate Key Pair"**
6. **Copy the Public Key** 
7. **Paste it in `.env.local`**:
```
VITE_FIREBASE_VAPID_KEY=YOUR_PUBLIC_KEY_HERE
```

## After Adding VAPID Key:

1. Restart dev server: `pnpm run dev`
2. Users will be prompted for notification permission on login
3. Notifications will work in real-time!

## Test Notifications:

Go to Firebase Console → Messaging → Create new message:
- Title: "Test Notification"
- Body: "This is a test"
- Select your web app
- Send to all users

Users should receive instant browser notifications! 🎉
