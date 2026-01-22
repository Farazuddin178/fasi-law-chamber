// Firebase Cloud Messaging setup (optional - requires Firebase project)
// For now, using browser Notification API as fallback

let messaging: any = null;

try {
  const { initializeApp } = require('firebase/app');
  const { getMessaging, getToken, onMessage } = require('firebase/messaging');

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }
} catch (err) {
  console.log('Firebase not configured, using browser Notification API');
}

export { messaging };

// Request notification permission and get FCM token
export const getFCMToken = async () => {
  try {
    if (!messaging) {
      console.log('Firebase not available');
      return null;
    }

    const { getToken } = require('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    if (token) {
      console.log('FCM Token obtained');
      return token;
    }
  } catch (err) {
    console.log('Could not get FCM token:', err);
  }
  return null;
};

// Listen for incoming messages
export const setupMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) return;

  try {
    const { onMessage } = require('firebase/messaging');
    onMessage(messaging, (payload: any) => {
      console.log('Message received:', payload);
      callback(payload);
    });
  } catch (err) {
    console.log('Error setting up message listener:', err);
  }
};
