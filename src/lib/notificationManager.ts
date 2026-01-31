/**
 * Centralized Notification Manager
 * Handles all app notifications: tasks, announcements, sitting arrangements, etc.
 */

import { supabase } from './supabase';
import toast from 'react-hot-toast';

interface NotificationPayload {
  title: string;
  message: string;
  type: 'task' | 'announcement' | 'sitting_arrangement' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId?: string; // specific user or undefined for all users
  relatedId?: string; // ID of related entity (task, case, etc.)
  metadata?: any;
}

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
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      priority: payload.priority,
      related_id: payload.relatedId || null,
      metadata: payload.metadata,
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
   */
  private async sendToAllUsers(payload: NotificationPayload) {
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('No active users to notify');
      return;
    }

    // Create notification records for each user
    const notifications = users.map(user => ({
      user_id: user.id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      priority: payload.priority,
      related_id: payload.relatedId || null,
      metadata: payload.metadata,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;

    // Try browser notification
    this.sendBrowserNotification(payload);
  }

  /**
   * Send browser notification (requires permission)
   */
  private sendBrowserNotification(payload: NotificationPayload) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(payload.title, {
          body: payload.message,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: payload.type,
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

  /**
   * Task Assignment Notification
   */
  async notifyTaskAssignment(taskTitle: string, assignedToUserId: string, assignedByName: string) {
    await this.send({
      title: '📋 New Task Assigned',
      message: `${assignedByName} assigned you: "${taskTitle}"`,
      type: 'task',
      priority: 'high',
      userId: assignedToUserId,
      metadata: { task_title: taskTitle },
    });

    // Also show toast
    toast.success(`Task assigned: ${taskTitle}`);
  }

  /**
   * Announcement Notification
   */
  async notifyAnnouncement(announcementTitle: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    await this.send({
      title: `📢 ${announcementTitle}`,
      message: message,
      type: 'announcement',
      priority: priority,
      // Send to all users (no userId specified)
    });

    toast.success('Announcement sent to all users');
  }

  /**
   * Sitting Arrangement Change Notification
   */
  async notifySittingArrangementChange(arrangementTitle: string, pdfUrl: string) {
    await this.send({
      title: '👨‍⚖️ New Sitting Arrangement',
      message: `Updated: ${arrangementTitle}`,
      type: 'sitting_arrangement',
      priority: 'high',
      metadata: { pdf_url: pdfUrl, title: arrangementTitle },
    });

    toast.success('Sitting arrangement notification sent');
  }

  /**
   * General Website Change Notification
   */
  async notifyWebsiteChange(changeDescription: string) {
    await this.send({
      title: '🔔 Website Update',
      message: changeDescription,
      type: 'general',
      priority: 'low',
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read for a user
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
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
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
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    const channel = supabase
      .channel('notifications')
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
          toast(notif.message, {
            icon: this.getIconForType(notif.type),
            duration: 5000,
          });
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
      default:
        return '🔔';
    }
  }
}

export const notificationManager = NotificationManager.getInstance();
export default notificationManager;
