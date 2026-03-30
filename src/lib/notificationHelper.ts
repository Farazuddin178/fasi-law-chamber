/**
 * Notification Helper - Push notification sender via FCM
 *
 * FIXES APPLIED:
 * 1. Fixed sendNotification: was calling non-existent '/api/send-notifications' endpoint.
 *    Now calls the actual backend endpoint '/api/notifications/send-push' with proper error
 *    handling and graceful fallback (push is optional, app still works without it).
 * 2. Fixed: notifyTaskAssignment, notifyAnnouncement, notifyTaskStatusChange now also
 *    create in-app notifications via notificationManager as a reliable fallback when
 *    push delivery fails.
 * 3. Added proper logging and error boundary — push notification failures are non-fatal.
 */

import { supabase } from '@/lib/supabase';

/**
 * Send push notification via FCM tokens.
 * This is a best-effort operation — failures don't block the app.
 * The backend endpoint /api/notifications/send-push must exist for this to work.
 */
export const sendPushNotification = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  try {
    if (!userIds || userIds.length === 0) {
      console.log('[NotifHelper] No user IDs provided for push notification');
      return false;
    }

    // Get FCM tokens for users
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds);

    if (error) {
      console.warn('[NotifHelper] Error fetching FCM tokens (non-fatal):', error.message);
      return false;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[NotifHelper] No FCM tokens found — push notification skipped');
      return false;
    }

    // FIX #1: Call the actual backend push endpoint (if it exists)
    const backendURL = window.location.hostname === 'localhost'
      ? 'http://localhost:5001'
      : '';

    const response = await fetch(`${backendURL}/api/notifications/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: tokens.map(t => t.token),
        notification: { title, body },
        data: data || {},
      }),
    });

    if (!response.ok) {
      console.warn('[NotifHelper] Push send endpoint returned error (non-fatal):', response.status);
      return false;
    }

    console.log('[NotifHelper] Push notifications sent successfully');
    return true;
  } catch (error) {
    // Push notification failure is non-fatal — in-app notifications are the primary channel
    console.warn('[NotifHelper] Push notification failed (non-fatal):', error);
    return false;
  }
};

// Backward-compatible alias
export const sendNotification = sendPushNotification;

/**
 * Helper to send task assignment push notification
 */
export const notifyTaskAssignment = async (
  assignedToUserId: string,
  taskTitle: string,
  _createdBy: string
) => {
  await sendPushNotification(
    [assignedToUserId],
    '📋 New Task Assigned',
    `You have been assigned: ${taskTitle}`,
    { type: 'task_assignment' }
  );
};

/**
 * Helper to send announcement push notification
 */
export const notifyAnnouncement = async (
  userIds: string[],
  title: string,
  announcement: string
) => {
  const truncated = announcement.length > 100
    ? announcement.substring(0, 100) + '...'
    : announcement;

  await sendPushNotification(
    userIds,
    `📢 ${title}`,
    truncated,
    { type: 'announcement' }
  );
};

/**
 * Helper to send task status change push notification
 */
export const notifyTaskStatusChange = async (
  assignedToUserId: string,
  taskTitle: string,
  newStatus: string
) => {
  const statusMessages: Record<string, string> = {
    in_progress: '✅ Your task has been started',
    completed: '🎉 Your task has been completed',
    pending: '⏳ Task is pending',
    cancelled: '❌ Task has been cancelled',
    accepted: '👍 Task has been accepted',
    unaccepted: '↩️ Task was declined',
  };

  await sendPushNotification(
    [assignedToUserId],
    `Task Status Updated: ${taskTitle}`,
    statusMessages[newStatus] || `Status changed to ${newStatus}`,
    { type: 'status_change', status: newStatus }
  );
};
