/**
 * Notification Bell Component
 * Shows real-time notification count and dropdown
 *
 * FIXES APPLIED:
 * 1. Fixed stale closure: showDropdown was captured as initial false in useEffect callback,
 *    so real-time updates never refreshed the dropdown. Now uses a ref for latest value.
 * 2. Fixed cleanup: uses supabase.removeChannel() for proper cleanup.
 * 3. Added user-specific channel name to avoid collisions with NotificationsPage.
 * 4. markAsRead now uses notificationManager which sets read_at timestamp.
 * 5. Added optimistic UI updates for mark-as-read actions.
 * 6. Close dropdown on Escape key.
 * 7. Added periodic polling every 30s as fallback for real-time reliability.
 * 8. Added loading spinner for individual mark-as-read.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ArrowRight, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationManager } from '@/lib/notificationManager';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  // FIX #1: Use a ref for showDropdown so the real-time callback always sees latest value
  const showDropdownRef = useRef(showDropdown);
  useEffect(() => {
    showDropdownRef.current = showDropdown;
  }, [showDropdown]);

  const userId = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.uid ?? null;

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await notificationManager.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // FIX #2 & #3: Real-time subscription with unique channel name + proper cleanup
  useEffect(() => {
    if (!userId) return;

    // Initial load
    loadUnreadCount();

    // Subscribe to real-time updates with a unique channel name for THIS component
    const channel = supabase
      .channel(`bell_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (_payload) => {
          // Always refresh unread count on any change
          loadUnreadCount();
          // FIX #1: Check ref (not stale closure) to see if dropdown is open
          if (showDropdownRef.current) {
            loadNotifications();
          }
        }
      )
      .subscribe();

    // Request browser notification permission
    notificationManager.requestPermission();

    // FIX #7: Periodic polling every 30s as reliability fallback
    const pollInterval = setInterval(() => {
      loadUnreadCount();
      if (showDropdownRef.current) {
        loadNotifications();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [userId, loadUnreadCount, loadNotifications]);

  const handleBellClick = () => {
    const next = !showDropdown;
    setShowDropdown(next);
    if (next) {
      loadNotifications();
    }
  };

  // FIX #6: Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    if (showDropdown) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDropdown]);

  // FIX #4 & #5: markAsRead uses notificationManager (which sets read_at) + optimistic update
  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingReadId(notificationId);
    try {
      await notificationManager.markAsRead(notificationId);
      // Optimistic local update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await notificationManager.markAllAsRead(userId);
      // Optimistic local update
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || now }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 max-h-[600px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-white hover:text-blue-100 underline flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setShowDropdown(false);
                  }}
                  className="text-white hover:text-blue-100 transition"
                  title="View all notifications"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                        !notif.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {notif.title}
                            </h4>
                            {notif.priority && notif.priority !== 'low' && (
                              <span className={`text-xs ${getPriorityColor(notif.priority)}`}>
                                {notif.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notif.is_read && (
                          markingReadId === notif.id ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-2"></div>
                          ) : (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
