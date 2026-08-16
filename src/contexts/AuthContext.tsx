import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, supabase } from '@/lib/supabase';
import { getFCMToken, setupMessageListener } from '@/lib/firebase';
import { notificationService } from '@/lib/notificationService';
import { useCapacitorPush } from '@/hooks/useCapacitorPush';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { showNotification, requestNotificationPermission } from '@/lib/notify';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loginLogId, setLoginLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Capacitor native push notifications ─────────────────────────────────
  // On native iOS/Android this requests permission + stores the device token.
  // On web this is a no-op (the Firebase Web SDK path below handles it).
  useCapacitorPush((user as any)?.id ?? null);

  // ── Realtime notification listener ──────────────────────────────────────
  // Raises an OS notification whenever a row lands in `notifications` for this
  // user. Mounted here so it is active on every screen, not just one page.
  useNotificationListener((user as any)?.id ?? null);

  useEffect(() => {
    // Restore any existing session. Everything here is defensive: a throw in
    // this effect would leave `loading` true forever and the app stuck behind
    // its spinner, which on a phone looks like the app failing to open.
    try {
      const savedUser = localStorage.getItem('current_user');
      const savedLoginLogId = localStorage.getItem('login_log_id');

      if (savedUser) {
        const userData = JSON.parse(savedUser);
        const normalizedUser = {
          ...userData,
          id: userData?.id ?? userData?.user_id ?? userData?.uid,
        };
        setUser(normalizedUser);
        setLoginLogId(savedLoginLogId);

        // Initialize FCM and notifications
        if (normalizedUser.id) {
          initializeFCM(normalizedUser.id);
        }
      }
    } catch (err) {
      // Corrupt or unreadable storage — drop it and start signed out rather
      // than wedging the app on every launch.
      console.error('[Auth] Could not restore session, clearing it:', err);
      try {
        localStorage.removeItem('current_user');
        localStorage.removeItem('login_log_id');
      } catch {
        /* storage unavailable — nothing more we can do */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeFCM = async (userId: string) => {
    try {
      // Ask for notification permission. This must go through the shared
      // helper: the old check bailed out when 'Notification' was absent from
      // window, which is always the case in an Android WebView, so the app
      // never requested the POST_NOTIFICATIONS permission Android 13+ needs.
      const granted = await requestNotificationPermission();
      console.log('[Auth] Notification permission granted:', granted);

      // Register service worker (optional for Firebase)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', reg);
        } catch (err) {
          console.log('Service Worker registration not critical:', err);
        }
      }

      // Try to get FCM token and store it
      const token = await getFCMToken();
      if (token) {
        await notificationService.storeFCMToken(userId, token);
        console.log('FCM token stored for user');
      } else {
        console.log('Using browser Notification API for notifications');
      }

      // Setup message listener
      setupMessageListener((payload) => {
        const { notification } = payload;
        if (notification) {
          // Raise a real OS notification (works in the browser and on native)
          void showNotification({
            title: notification.title || 'Notification',
            body: notification.body,
          });
          toast.success(notification.body || notification.title);
        }
      });
    } catch (error) {
      console.error('Notification setup error (not critical):', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { email, password }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      const userData = data.data.user;
      const normalizedUser = {
        ...userData,
        id: userData?.id ?? userData?.user_id ?? userData?.uid,
      };
      const logId = data.data.login_log_id;

      setUser(normalizedUser);
      setLoginLogId(logId);
      localStorage.setItem('current_user', JSON.stringify(normalizedUser));
      localStorage.setItem('login_log_id', logId);

      // Create Supabase Auth session so auth.uid() works in RLS policies
      try {
        await supabase.auth.signInWithPassword({ email, password });
      } catch {
        // Non-critical: permissive anon policies ensure data is still accessible
      }

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user && loginLogId) {
        await supabase.functions.invoke('auth-logout', {
          body: {
            user_id: user.id,
            login_log_id: loginLogId
          }
        });
      }

      await supabase.auth.signOut().catch(() => {});

      setUser(null);
      setLoginLogId(null);
      localStorage.removeItem('current_user');
      localStorage.removeItem('login_log_id');

      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data);
        localStorage.setItem('current_user', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
