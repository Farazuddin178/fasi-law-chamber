/**
 * useNotificationListener — turns rows in the `notifications` table into real
 * notifications on the logged-in user's device.
 *
 * WHY THIS EXISTS
 * notificationManager.subscribeToNotifications() was written but never called
 * from anywhere in the app. Nothing listened for new notification rows, so the
 * only thing that ever happened on the recipient's side was NotificationBell
 * polling an unread count — the icon went up, and the phone stayed silent.
 *
 * Equally important, notifications used to be raised on the *sender's* device:
 * sendToUser() called sendBrowserNotification() straight after the insert, so
 * the person assigning a task got the popup and the assignee got nothing. The
 * correct trigger is the recipient's own realtime subscription, which is what
 * this hook attaches.
 *
 * It is mounted once in AuthContext, so it is live on every screen rather than
 * only while the Tasks page happens to be open.
 *
 * REQUIRES: the `notifications` table must be in the supabase_realtime
 * publication, otherwise postgres_changes never fires. See
 * supabase_enable_realtime_notifications.sql.
 */

import { useEffect } from 'react';
import { notificationManager } from '@/lib/notificationManager';
import { showNotification, requestNotificationPermission } from '@/lib/notify';

export function useNotificationListener(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    // Make sure we are actually allowed to post before anything arrives.
    void requestNotificationPermission();

    const channel = notificationManager.subscribeToNotifications(userId, (notification) => {
      if (!notification) return;

      void showNotification({
        title: notification.title || 'New notification',
        body: notification.message || '',
        // One id per notification row, so separate events stack rather than
        // overwrite each other.
        tag: `notification_${notification.id ?? Date.now()}`,
      });
    });

    return () => {
      try {
        channel?.unsubscribe();
      } catch (err) {
        console.warn('[notifications] Failed to unsubscribe:', err);
      }
    };
  }, [userId]);
}
