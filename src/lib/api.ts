/**
 * Centralized backend API configuration.
 *
 * Why absolute URLs are required for Capacitor:
 *   In a native app the WebView origin is `capacitor://localhost` (iOS) or
 *   `http://localhost` (Android), NOT your Render domain.  Relative paths like
 *   `/getCaseDetails` would resolve to `capacitor://localhost/getCaseDetails`
 *   which goes nowhere.  We must always point at the real Render hostname.
 *
 * Usage:
 *   import { BACKEND_URL } from '@/lib/api';
 *   fetch(`${BACKEND_URL}/getCaseDetails?...`)
 */

import { Capacitor } from '@capacitor/core';

/** Returns true when the JS bundle is running inside a Capacitor native shell */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * The absolute URL of your Python/Flask backend hosted on Render.
 *
 * Set VITE_BACKEND_URL in your .env file:
 *   VITE_BACKEND_URL=https://your-app-name.onrender.com
 *
 * For local development start the Flask server on port 5001 and add:
 *   VITE_BACKEND_URL=http://localhost:5001
 */
export const BACKEND_URL: string = (() => {
  // 1. Env var — highest priority, works for both web and native
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL as string;
  }

  // 2. Running inside Capacitor native shell — must use absolute URL.
  // This is the `fasi-law-chamber` service from render.yaml. It previously read
  // 'https://your-app-name.onrender.com', an unreplaced placeholder, so every
  // backend call from the mobile app resolved to a domain that does not exist —
  // which is why the app worked in the browser but not as a native app.
  if (Capacitor.isNativePlatform()) {
    return 'https://fasi-law-chamber.onrender.com';
  }

  // 3. Browser dev server — use local proxy
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5001';
  }

  // 4. Production web — same origin (Vercel/Render static + backend on same domain)
  return '';
})();
