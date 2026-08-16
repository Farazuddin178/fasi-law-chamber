/**
 * showNotification — one call that raises a real OS notification on every
 * platform this app runs on.
 *
 * WHY THIS EXISTS
 * The app used `new Notification(...)` (the Web Notification API) directly.
 * That works in a desktop browser, but an Android WebView does **not**
 * implement it: `'Notification' in window` is false inside Capacitor, so those
 * calls were skipped entirely. The in-app bell updated, and nothing ever
 * reached the phone's notification shade.
 *
 * Here, native goes through @capacitor/local-notifications, which posts to the
 * real Android/iOS notification system.
 *
 * SCOPE — please read:
 * Local notifications are raised *by the app*, so they only appear while the
 * app is running (foreground, or backgrounded but not killed). Instagram-style
 * delivery to a closed app requires a push service (FCM) actively sending to
 * the device, which needs:
 *   1. a Firebase project + android/app/google-services.json  (see MOBILE_APP.md)
 *   2. VITE_ENABLE_PUSH=true so useCapacitorPush registers for a token
 *   3. a server that actually sends — /api/notifications/send-push in
 *      notification_routes.py is currently a placeholder that only logs.
 * Until all three exist, this module is what puts notifications on the phone.
 */

import { Capacitor } from '@capacitor/core';

export interface NotifyOptions {
  title: string;
  body?: string;
  /** Groups/replaces notifications — same tag replaces the previous one. */
  tag?: string;
  /** Web only; native uses the app icon. */
  icon?: string;
}

/** Small stable id from a tag so repeat notifications replace rather than stack. */
function idFromTag(tag?: string): number {
  if (!tag) return Math.floor(Math.random() * 2_000_000_000);
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  // Android notification ids must be positive 32-bit ints
  return Math.abs(hash) || 1;
}

let nativePermissionChecked = false;
let nativePermissionGranted = false;

async function ensureNativePermission(): Promise<boolean> {
  if (nativePermissionChecked) return nativePermissionGranted;
  nativePermissionChecked = true;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    nativePermissionGranted = status.display === 'granted';
  } catch (err) {
    console.warn('[notify] Local notification permission check failed:', err);
    nativePermissionGranted = false;
  }

  return nativePermissionGranted;
}

/**
 * Ask for notification permission up front. Safe to call repeatedly; the
 * result is cached. Android 13+ will not deliver anything until the user has
 * granted POST_NOTIFICATIONS, and the prompt only appears when requested.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return ensureNativePermission();
  }

  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Raise a notification. Never throws — a failed notification must not break the
 * action that triggered it.
 */
export async function showNotification(opts: NotifyOptions): Promise<void> {
  const { title, body = '', tag, icon } = opts;

  try {
    if (Capacitor.isNativePlatform()) {
      if (!(await ensureNativePermission())) return;

      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            id: idFromTag(tag),
            title,
            body,
            // No `schedule` field => deliver immediately.
            // No `smallIcon` => Capacitor falls back to the app icon, so this
            // does not depend on a drawable that may not exist.
            autoCancel: true,
          },
        ],
      });
      return;
    }

    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    new Notification(title, { body, tag, icon: icon ?? '/favicon.svg' });
  } catch (err) {
    console.warn('[notify] Could not display notification:', err);
  }
}
