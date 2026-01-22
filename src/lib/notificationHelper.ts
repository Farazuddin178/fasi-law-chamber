import { supabase } from '@/lib/supabase';

// This function should be called from your backend/Supabase Edge Function
// For now, you can use this as a helper to send notifications

export const sendNotification = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  try {
    // Get FCM tokens for users
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching FCM tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens found for users');
      return;
    }

    // Call your backend API to send notifications via FCM
    // This requires Firebase Admin SDK on your backend
    const response = await fetch('/api/send-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: tokens.map(t => t.token),
        notification: {
          title,
          body,
        },
        data: data || {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send notifications');
    }

    console.log('Notifications sent successfully');
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

// Helper to send task assignment notification
export const notifyTaskAssignment = async (
  assignedToUserId: string,
  taskTitle: string,
  createdBy: string
) => {
  await sendNotification(
    [assignedToUserId],
    '📋 New Task Assigned',
    `You have been assigned: ${taskTitle}`,
    { type: 'task_assignment' }
  );
};

// Helper to send announcement notification
export const notifyAnnouncement = async (
  userIds: string[],
  title: string,
  announcement: string
) => {
  await sendNotification(
    userIds,
    '📢 New Announcement',
    announcement.substring(0, 100) + '...',
    { type: 'announcement' }
  );
};

// Helper to send status change notification
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
  };

  await sendNotification(
    [assignedToUserId],
    `Task Status Updated: ${taskTitle}`,
    statusMessages[newStatus] || `Status changed to ${newStatus}`,
    { type: 'status_change', status: newStatus }
  );
};
