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
 *
 * OPT-IN ON PURPOSE — read before enabling:
 * On Android, PushNotifications.register() goes through Firebase Cloud
 * Messaging. If android/app/google-services.json is absent, FCM throws
 * "Default FirebaseApp is not initialized in this process" as a *native*
 * exception, which kills the app process — a JS try/catch cannot save it.
 *
 * Because this hook runs as soon as a user id exists, and AuthContext restores
 * the saved user from localStorage on boot, that crash happened on every
 * launch after the first successful login: the app appeared to open and then
 * immediately close.
 *
 * So push stays off unless it is explicitly switched on:
 *   1. Add your google-services.json to android/app/ (and
 *      GoogleService-Info.plist to the iOS project).
 *   2. Set VITE_ENABLE_PUSH=true, then re-run `pnpm run cap:sync`.
 * Without both, the app runs normally and simply has no native push.
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

/** Native push only runs when the app was built with VITE_ENABLE_PUSH=true. */
const PUSH_ENABLED = import.meta.env.VITE_ENABLE_PUSH === 'true';

export function useCapacitorPush(userId: string | null) {
  useEffect(() => {
    // Only activate on a real iOS / Android device — skip in browser
    if (!Capacitor.isNativePlatform() || !userId) return;

    if (!PUSH_ENABLED) {
      console.info(
        '[CapacitorPush] Disabled. Set VITE_ENABLE_PUSH=true and add google-services.json to enable.'
      );
      return;
    }

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
    setupPush()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((err) => {
        // Never let a push failure escape as an unhandled rejection; the app
        // must keep working without notifications.
        console.error('[CapacitorPush] Setup failed, continuing without push:', err);
      });

    return () => {
      if (cleanup) cleanup();
    };
  }, [userId]);
}
