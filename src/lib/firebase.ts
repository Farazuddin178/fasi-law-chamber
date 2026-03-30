/**
 * Firebase Cloud Messaging setup (optional - requires Firebase project)
 * Falls back to browser Notification API if Firebase is not configured.
 *
 * FIXES APPLIED:
 * 1. Fixed: was using require() which doesn't work in Vite/ESM environment.
 *    Now uses dynamic import() wrapped in async initialization.
 * 2. Fixed: getToken and onMessage were imported twice (top-level + inline).
 *    Now uses a single async init pattern with lazy loading.
 * 3. Added proper null checks and graceful degradation throughout.
 * 4. Firebase is fully optional — app works without it using browser Notification API.
 */

// Lazy-loaded Firebase messaging instance
let messaging: any = null;
let firebaseInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Firebase lazily. Only loads the Firebase SDK if config is present.
 */
async function initializeFirebase(): Promise<void> {
  if (firebaseInitialized) return;

  // Prevent multiple concurrent initializations
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) {
        console.log('[Firebase] No project ID configured, using browser Notification API');
        firebaseInitialized = true;
        return;
      }

      // FIX #1: Use dynamic import() instead of require()
      const { initializeApp } = await import('firebase/app');
      const { getMessaging } = await import('firebase/messaging');

      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: projectId,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
      console.log('[Firebase] Messaging initialized successfully');
    } catch (err) {
      console.log('[Firebase] Not configured or failed to initialize, using browser Notification API:', err);
      messaging = null;
    } finally {
      firebaseInitialized = true;
    }
  })();

  return initPromise;
}

export { messaging };

/**
 * Request notification permission and get FCM token
 * Returns null if Firebase is not available (graceful degradation)
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    await initializeFirebase();

    if (!messaging) {
      console.log('[Firebase] Not available, skipping FCM token');
      return null;
    }

    // FIX #2: Use dynamic import for getToken (no double import)
    const { getToken } = await import('firebase/messaging');
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.log('[Firebase] No VAPID key configured, skipping FCM token');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    if (token) {
      console.log('[Firebase] FCM Token obtained');
      return token;
    }

    console.log('[Firebase] No FCM token returned');
    return null;
  } catch (err) {
    console.log('[Firebase] Could not get FCM token (non-fatal):', err);
    return null;
  }
};

/**
 * Listen for incoming foreground messages
 * Calls the callback when a Firebase push message arrives while app is open
 */
export const setupMessageListener = async (callback: (payload: any) => void) => {
  try {
    await initializeFirebase();

    if (!messaging) return;

    // FIX #2: Use dynamic import for onMessage (no double import)
    const { onMessage } = await import('firebase/messaging');
    onMessage(messaging, (payload: any) => {
      console.log('[Firebase] Foreground message received:', payload);
      callback(payload);
    });
  } catch (err) {
    console.log('[Firebase] Error setting up message listener (non-fatal):', err);
  }
};
