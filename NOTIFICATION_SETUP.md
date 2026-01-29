# 🔔 Notification System Setup

## ✅ What's Been Implemented

### 1. **Dual Server Deployment on Render**
- Frontend: Static React site
- Backend: Python Flask API with Selenium scraper
- Both configured in `render.yaml`

### 2. **Comprehensive Notification System**

#### Features:
- ✅ Task assignment notifications
- ✅ Announcement broadcasts to all users
- ✅ Sitting arrangement change alerts
- ✅ General website change notifications
- ✅ Real-time notification bell UI component
- ✅ Browser push notifications
- ✅ In-app notification center

#### Components Created:
- `src/lib/notificationManager.ts` - Centralized notification service
- `src/components/NotificationBell.tsx` - UI component with unread count
- Database table: `notifications` (see migration file)

---

## 🚀 Deployment Steps

### Step 1: Deploy to Render

1. **Go to** https://render.com
2. **Sign in with GitHub**
3. **Create New Project** → Select your repo: `Farazuddin178/fasi-law-chamber`
4. Render will automatically detect `render.yaml` and create:
   - **Backend service**: `fasi-law-backend`
   - **Frontend service**: `fasi-law-frontend`

5. **Set Environment Variables** for frontend:
   ```
   VITE_BACKEND_URL = https://fasi-law-backend.onrender.com
   VITE_SUPABASE_URL = your-supabase-project-url
   VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
   ```

6. **Deploy** - Both services will build and deploy automatically!

---

## 📊 Setup Notifications Database

### Run Migration in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260129_create_notifications.sql`
3. Run the migration
4. Verify table created: Check "Table Editor" → `notifications`

---

## 🧪 Testing Notifications

### Test Task Assignment:
1. Go to **Tasks** page
2. Create a new task
3. Assign it to another user
4. That user should see:
   - Bell icon badge increase
   - Browser notification (if permission granted)
   - In-app notification in dropdown

### Test Announcements:
1. Go to **Announcements** page
2. Create new announcement
3. ALL users should receive notification

### Test Sitting Arrangements:
1. Go to **Sitting Arrangements** page
2. When new arrangement is detected
3. ALL users receive notification

---

## 🔧 How It Works

### Notification Flow:

1. **Action Triggered** (task assigned, announcement created, etc.)
2. **NotificationManager.send()** is called
3. **Database Record Created** in `notifications` table
4. **Real-time Trigger** via Supabase subscriptions
5. **NotificationBell Component** updates badge count
6. **Browser Notification** sent if permission granted
7. **Toast Message** shown to user

### Real-time Updates:

```typescript
// Automatic subscription in NotificationBell component
notificationManager.subscribeToNotifications(userId, (notification) => {
  // Badge updates automatically
  // Toast shown automatically
  // Browser notification sent automatically
});
```

---

## ⚙️ Customization

### Change Notification Priorities:

```typescript
// In your component
await notificationManager.notifyAnnouncement(
  'Emergency Alert',
  'Court closed today',
  'urgent' // 'low' | 'medium' | 'high' | 'urgent'
);
```

### Send Custom Notifications:

```typescript
await notificationManager.send({
  title: 'Custom Event',
  message: 'Something happened',
  type: 'general',
  priority: 'medium',
  userId: 'specific-user-id', // or undefined for all users
  metadata: { custom: 'data' }
});
```

---

## 🎨 UI Customization

The notification bell appears in the top-right header:
- Shows unread count badge
- Dropdown shows last 10 notifications
- Color-coded by priority
- Icons by notification type

Modify appearance in:
- `src/components/NotificationBell.tsx`
- `src/components/DashboardLayout.tsx`

---

## 🔐 Permissions

### Browser Notifications:
Users must grant permission. Request happens automatically on first login.

Manual request:
```typescript
await notificationManager.requestPermission();
```

### Database Security:
- Users can only see their own notifications (RLS policy)
- Only admins can create notifications
- Real-time enabled for live updates

---

## 📱 Mobile Support

Notifications work on:
- ✅ Desktop browsers (Chrome, Firefox, Edge, Safari)
- ✅ Mobile web (requires HTTPS in production)
- ✅ PWA (Progressive Web App)

For native mobile push:
- Implement Firebase Cloud Messaging (FCM)
- Already supported in `notificationManager.ts`

---

## 🐛 Troubleshooting

**Notifications not appearing?**
1. Check browser permission: Settings → Site Settings → Notifications
2. Verify migration ran successfully in Supabase
3. Check browser console for errors
4. Ensure real-time is enabled on `notifications` table

**Bell icon not showing?**
1. Verify `NotificationBell` imported in `DashboardLayout.tsx`
2. Check user is logged in
3. Verify Supabase connection

**Backend not sending notifications?**
1. Check task/announcement creation succeeds
2. Verify `notificationManager` import works
3. Check network tab for API calls
4. Look for errors in browser console

---

## 📊 Monitoring

View all notifications in Supabase:
```sql
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 100;
```

Unread count per user:
```sql
SELECT user_id, COUNT(*) as unread_count
FROM notifications
WHERE read = FALSE
GROUP BY user_id;
```

---

## 🔮 Future Enhancements

- [ ] Email notifications
- [ ] SMS notifications (Twilio)
- [ ] Notification preferences (user settings)
- [ ] Notification history page
- [ ] Notification categories filter
- [ ] Batch actions (mark all as read)
- [ ] Notification sounds
- [ ] Desktop app notifications (Electron)

---

**System fully configured! Deploy and test!** 🚀
