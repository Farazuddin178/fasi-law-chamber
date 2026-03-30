/**
 * Notifications Page - Full notification list with CRUD operations
 *
 * FIXES APPLIED:
 * 1. Fixed real-time cleanup leak: setupRealTimeSubscription() returned a cleanup function
 *    that was never called — the useEffect discarded the return value. Now uses inline
 *    subscription + proper cleanup via supabase.removeChannel().
 * 2. Fixed channel name collision: uses unique channel name 'page_notifications_<userId>'
 *    to avoid conflicting with NotificationBell's channel.
 * 3. Fixed markAsRead: now also sets read_at timestamp.
 * 4. Fixed markAllAsRead: now uses user_id + is_read filter directly (more efficient than
 *    collecting IDs client-side) and sets read_at.
 * 5. Added delete-all functionality.
 * 6. Added proper error handling throughout.
 * 7. Added "mark as unread" capability.
 * 8. Improved filter to include "high priority" option.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trash2, CheckCircle, AlertCircle, FileText, Users, Calendar, Clock, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.uid ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error('Failed to load notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // FIX #1 & #2: Inline real-time subscription with proper cleanup
  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const channel = supabase
      .channel(`page_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (_payload) => {
          // Reload on any change (INSERT, UPDATE, DELETE)
          loadNotifications();
        }
      )
      .subscribe();

    // FIX #1: Actually return cleanup function from useEffect
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  // FIX #3: markAsRead now also sets read_at
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error: any) {
      toast.error('Failed to update notification');
      console.error(error);
    }
  };

  // FIX #7: Mark as unread
  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('id', notificationId);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: false, read_at: null }
            : n
        )
      );
    } catch (error: any) {
      toast.error('Failed to update notification');
      console.error(error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setDeleteLoading(notificationId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error('Failed to delete notification');
      console.error(error);
    } finally {
      setDeleteLoading(null);
    }
  };

  // FIX #4: markAllAsRead uses server-side filter (more efficient) and sets read_at
  const markAllAsRead = async () => {
    if (!userId) return;
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (unreadCount === 0) {
      toast.success('No unread notifications');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      // Optimistic local update
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || now }))
      );
      toast.success(`Marked ${unreadCount} notification(s) as read`);
    } catch (error: any) {
      toast.error('Failed to mark all as read');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // FIX #5: Delete all notifications
  const deleteAllNotifications = async () => {
    if (!userId) return;
    if (notifications.length === 0) return;
    if (!window.confirm(`Delete all ${notifications.length} notifications? This cannot be undone.`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error: any) {
      toast.error('Failed to delete all notifications');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // FIX #8: Improved filtering with high-priority option
  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((n) => new Date(n.created_at) >= today);
    } else if (filter === 'high_priority') {
      filtered = filtered.filter((n) => n.priority === 'high' || n.priority === 'urgent');
    }

    return filtered;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'roster_change':
      case 'sitting_arrangement':
        return <Users className="w-5 h-5" />;
      case 'task':
      case 'task_assigned':
        return <CheckCircle className="w-5 h-5" />;
      case 'case_updated':
      case 'document_uploaded':
        return <FileText className="w-5 h-5" />;
      case 'hearing_scheduled':
        return <Calendar className="w-5 h-5" />;
      case 'order_issued':
        return <AlertCircle className="w-5 h-5" />;
      case 'announcement':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'roster_change':
      case 'sitting_arrangement':
        return 'bg-blue-100 text-blue-800';
      case 'task':
      case 'task_assigned':
        return 'bg-green-100 text-green-800';
      case 'case_updated':
        return 'bg-purple-100 text-purple-800';
      case 'document_uploaded':
        return 'bg-yellow-100 text-yellow-800';
      case 'hearing_scheduled':
        return 'bg-orange-100 text-orange-800';
      case 'order_issued':
        return 'bg-red-100 text-red-800';
      case 'announcement':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const highPriorityCount = notifications.filter((n) => n.priority === 'high' || n.priority === 'urgent').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600 mt-1">Stay updated with all activities</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
                <p className="text-sm text-gray-600">Unread</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'high_priority'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              High Priority ({highPriorityCount})
            </button>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Mark all as read'}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition disabled:opacity-50"
              >
                Delete all
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  notification.is_read
                    ? 'border-gray-200 bg-white'
                    : 'border-blue-300 bg-blue-50 hover:border-blue-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 p-2 rounded-lg ${getNotificationBadgeColor(
                      notification.type
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{notification.title}</h3>
                          {!notification.is_read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                          {notification.priority && (notification.priority === 'high' || notification.priority === 'urgent') && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              notification.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {notification.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {/* FIX #7: Toggle read/unread */}
                        {!notification.is_read ? (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                            title="Mark as read"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsUnread(notification.id)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title="Mark as unread"
                          >
                            <EyeOff className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          disabled={deleteLoading === notification.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                          title="Delete notification"
                        >
                          {deleteLoading === notification.id ? (
                            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {filter === 'unread'
                  ? 'No unread notifications'
                  : filter === 'high_priority'
                  ? 'No high priority notifications'
                  : 'No notifications'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {filter === 'unread'
                  ? 'All caught up! You have read all notifications'
                  : "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
