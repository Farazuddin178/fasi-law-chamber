/**
 * useCapacitorPush — Capacitor native push notification integration.
 *
 * This hook handles the full native push lifecycle:
 *  1. Request OS-level notification permissions
 *  2. Register the device with APNs / FCM
 *  3. Receive the native device token and store it in Supabase fcm_tokens
 *  4. Listen for foreground push payloads and surface them as toast notifications
 *  5. Clean up all listeners on unmount
 *
 * The hook is a no-op on web (browser) — it degrades gracefully via the
 * existing Firebase Web SDK path in AuthContext.
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import toast from 'react-hot-toast';
import { notificationService } from '@/lib/notificationService';

export function useCapacitorPush(userId: string | null) {
  useEffect(() => {
    // Only activate on a real iOS / Android device — skip in browser
    if (!Capacitor.isNativePlatform() || !userId) return;

    let registered = false;

    const setupPush = async () => {
      // ── 1. Check / request permission ─────────────────────────────────────
      let permission = await PushNotifications.checkPermissions();

      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        console.warn('[CapacitorPush] Permission not granted — push disabled');
        return;
      }

      // ── 2. Register with APNs (iOS) or FCM (Android) ─────────────────────
      await PushNotifications.register();
      registered = true;

      // ── 3. Token received — persist to Supabase ───────────────────────────
      const tokenListener = await PushNotifications.addListener(
        'registration',
        async (token: Token) => {
          console.log('[CapacitorPush] Device token received:', token.value);
          await notificationService.storeFCMToken(userId, token.value);
        }
      );

      // ── 4. Registration error ─────────────────────────────────────────────
      const errorListener = await PushNotifications.addListener(
        'registrationError',
        (error) => {
          console.error('[CapacitorPush] Registration error:', error);
        }
      );

      // ── 5. Foreground push received — show toast ──────────────────────────
      const foregroundListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          const title = notification.title ?? 'New notification';
          const body = notification.body ?? '';
          toast(body ? `${title}: ${body}` : title, { duration: 5000 });
          console.log('[CapacitorPush] Foreground notification:', notification);
        }
      );

      // ── 6. User tapped a notification (background/killed) ─────────────────
      const actionListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[CapacitorPush] Notification action:', action.notification.data);
          // TODO: navigate to the relevant screen based on action.notification.data
        }
      );

      // Cleanup: remove all listeners when userId changes or component unmounts
      return () => {
        tokenListener.remove();
        errorListener.remove();
        foregroundListener.remove();
        actionListener.remove();
      };
    };

    let cleanup: (() => void) | undefined;
    setupPush().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [userId]);
}
