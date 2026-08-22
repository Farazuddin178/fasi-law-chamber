/**
 * Open a URL outside the app.
 *
 * In a Capacitor WebView a plain `<a target="_blank">` does not open a browser -
 * it navigates the WebView itself. Worse, capacitor.config.ts allowNavigation
 * permits *.onrender.com, so tapping the chamber website loaded the site inside
 * the app shell and it came up at the login screen, looking like the app had
 * logged the user out.
 *
 * @capacitor/browser hands the URL to the system browser (Chrome Custom Tab on
 * Android, SFSafariViewController on iOS), which keeps the app intact and gives
 * the user a real address bar and back button. On the web we just open a tab.
 */

import { Capacitor } from '@capacitor/core';

export async function openExternal(url: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (err) {
    console.error('[openExternal] Could not open browser, falling back:', err);
    window.open(url, '_blank');
  }
}
