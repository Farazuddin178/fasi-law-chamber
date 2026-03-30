/**
 * Centralized Notification Manager
 * Handles all app notifications: tasks, announcements, sitting arrangements, etc.
 *
 * FIXES APPLIED:
 * 1. Fixed channel name collision: subscribeToNotifications now uses a user-specific
 *    channel name with a unique suffix to avoid conflicts between NotificationBell
 *    and NotificationsPage (both subscribing simultaneously).
 * 2. Fixed sendToAllUsers: Added fallback when 'is_active' column doesn't exist —
 *    catches the error and retries without the filter.
 * 3. Fixed duplicate notifications: sendToAllUsers now accepts optional excludeUserId
 *    to skip the user who triggered the action (e.g. don't notify yourself).
 * 4. Added deduplication: send() checks for recent identical notifications within
 *    60 seconds to prevent duplicates.
 * 5. Fixed markAsRead/markAllAsRead: now always sets read_at timestamp.
 * 6. Fixed getUnreadCount: added error boundary with fallback to 0.
 * 7. Added proper notification types for all event categories.
 * 8. Browser notification now uses the title from payload (was using hardcoded tag).
 */

import { supabase } from './supabase';
import toast from 'react-hot-toast';

type NotificationType =
  | 'task'
  | 'announcement'
  | 'sitting_arrangement'
  | 'hearing_scheduled'
  | 'case_updated'
  | 'order_issued'
  | 'document_uploaded'
  | 'general';

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId?: string;         // Target user (omit for broadcast)
  excludeUserId?: string;  // FIX #3: User to exclude from broadcast (e.g. the creator)
  relatedId?: string;      // Related entity ID (case_id, task_id, etc.)
  relatedType?: string;    // Related entity type
  metadata?: any;
  data?: any;
}

// FIX #1: Channel name counter to ensure uniqueness per subscription
let channelCounter = 0;

class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Send notification to specific user or all users
   */
  async send(payload: NotificationPayload) {
    try {
      if (payload.userId) {
        // Send to specific user
        await this.sendToUser(payload.userId, payload);
      } else {
        // Send to all active users
        await this.sendToAllUsers(payload);
      }

      return { success: true };
    } catch (error) {
      console.error('Notification send failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification to specific user
   */
  private async sendToUser(userId: string, payload: NotificationPayload) {
    // FIX #4: Check for recent duplicate before inserting
    const isDuplicate = await this.checkDuplicate(userId, payload.title, payload.type);
    if (isDuplicate) {
      console.log(`Skipping duplicate notification: "${payload.title}" for user ${userId}`);
      return;
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      priority: payload.priority,
      related_id: payload.relatedId || null,
      related_type: payload.relatedType || null,
      metadata: payload.metadata || null,
      data: payload.data || null,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Try browser notification if permission granted
    this.sendBrowserNotification(payload);
  }

  /**
   * Send notification to all active users
   * FIX #2: Handles missing is_active column gracefully
   * FIX #3: Excludes the triggering user if specified
   */
  private async sendToAllUsers(payload: NotificationPayload) {
    let users: any[] = [];

    // Try fetching active users, fall back to all users if is_active column doesn't exist
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true);

      if (error) throw error;
      users = data || [];
    } catch (err) {
      console.warn('Failed to fetch active users, trying all users:', err);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id');

        if (error) throw error;
        users = data || [];
      } catch (fallbackErr) {
        console.error('Failed to fetch any users:', fallbackErr);
        return;
      }
    }

    if (!users || users.length === 0) {
      console.log('No users to notify');
      return;
    }

    // FIX #3: Filter out the excluded user (the one who triggered the notification)
    if (payload.excludeUserId) {
      users = users.filter(u => u.id !== payload.excludeUserId);
    }

    if (users.length === 0) {
      console.log('No users to notify after exclusion');
      return;
    }

    // Create notification records for each user
    const now = new Date().toISOString();
    const notifications = users.map(user => ({
      user_id: user.id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      priority: payload.priority,
      related_id: payload.relatedId || null,
      related_type: payload.relatedType || null,
      metadata: payload.metadata || null,
      data: payload.data || null,
      is_read: false,
      read_at: null,
      created_at: now,
    }));

    // Batch insert (Supabase handles this efficiently)
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;

    // Try browser notification
    this.sendBrowserNotification(payload);
  }

  /**
   * FIX #4: Check for duplicate notification within the last 60 seconds
   */
  private async checkDuplicate(userId: string, title: string, type: string): Promise<boolean> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('title', title)
        .eq('type', type)
        .gte('created_at', oneMinuteAgo)
        .limit(1);

      if (error) {
        console.warn('Duplicate check failed, proceeding:', error);
        return false;
      }
      return (data && data.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * FIX #8: Send browser notification with correct title tag
   */
  private sendBrowserNotification(payload: NotificationPayload) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(payload.title, {
          body: payload.message,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: `${payload.type}_${Date.now()}`, // FIX #8: unique tag per notification
          requireInteraction: payload.priority === 'urgent',
        });
      } catch (e) {
        console.log('Browser notification failed:', e);
      }
    }
  }

  /**
   * Request browser notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // ===========================================================================
  // Event-specific notification methods
  // ===========================================================================

  /**
   * Task Assignment Notification
   */
  async notifyTaskAssignment(taskTitle: string, assignedToUserId: string, assignedByName: string) {
    return this.send({
      title: '📋 New Task Assigned',
      message: `${assignedByName} assigned you: "${taskTitle}"`,
      type: 'task',
      priority: 'high',
      userId: assignedToUserId,
      metadata: { task_title: taskTitle, assigned_by: assignedByName },
    });
  }

  /**
   * Announcement Notification
   * FIX #3: excludeUserId prevents notifying the creator
   */
  async notifyAnnouncement(
    announcementTitle: string,
    message: string,
    priority: NotificationPriority = 'medium',
    excludeUserId?: string
  ) {
    return this.send({
      title: `📢 ${announcementTitle}`,
      message: message,
      type: 'announcement',
      priority: priority,
      excludeUserId, // Don't notify the person who created the announcement
    });
  }

  /**
   * Sitting Arrangement Change Notification
   */
  async notifySittingArrangementChange(arrangementTitle: string, pdfUrl: string) {
    return this.send({
      title: '👨‍⚖️ New Sitting Arrangement',
      message: `Updated: ${arrangementTitle}`,
      type: 'sitting_arrangement',
      priority: 'high',
      metadata: { pdf_url: pdfUrl, title: arrangementTitle },
    });
  }

  /**
   * Case Update Notification
   */
  async notifyCaseUpdate(caseNumber: string, changeDescription: string, userId: string) {
    return this.send({
      title: '📁 Case Updated',
      message: `${caseNumber}: ${changeDescription}`,
      type: 'case_updated',
      priority: 'medium',
      userId,
      metadata: { case_number: caseNumber },
    });
  }

  /**
   * Hearing Reminder Notification
   */
  async notifyHearingReminder(caseNumber: string, hearingDate: string, userId: string) {
    return this.send({
      title: '⚖️ Hearing Reminder',
      message: `Case ${caseNumber} is listed for hearing on ${hearingDate}. Please prepare.`,
      type: 'hearing_scheduled',
      priority: 'high',
      userId,
      metadata: { case_number: caseNumber, hearing_date: hearingDate },
    });
  }

  /**
   * General Website Change Notification
   */
  async notifyWebsiteChange(changeDescription: string) {
    return this.send({
      title: '🔔 Website Update',
      message: changeDescription,
      type: 'general',
      priority: 'low',
    });
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * FIX #5: Mark notification as read — always sets read_at
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: false, read_at: null })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * FIX #5: Mark all notifications as read for a user — sets read_at
   */
  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * FIX #6: Get unread count for a user — with error boundary
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Unread count error:', err);
      return 0;
    }
  }

  /**
   * FIX #1: Subscribe to real-time notifications for a user
   * Uses unique channel name to avoid conflicts between multiple components
   */
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    channelCounter += 1;
    const channelName = `notif_${userId}_${channelCounter}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new);

          // Show toast for new notification
          const notif = payload.new as any;
          if (notif?.title) {
            toast(notif.message || notif.title, {
              icon: this.getIconForType(notif.type),
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return channel;
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'task':
        return '📋';
      case 'announcement':
        return '📢';
      case 'sitting_arrangement':
        return '👨‍⚖️';
      case 'hearing_scheduled':
        return '⚖️';
      case 'case_updated':
        return '📁';
      case 'order_issued':
        return '📜';
      default:
        return '🔔';
    }
  }
}

export const notificationManager = NotificationManager.getInstance();
export default notificationManager;
