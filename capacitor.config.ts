import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must match the applicationId in AndroidManifest.xml / Bundle Identifier in Xcode
  appId: 'com.tshclegal.app',
  appName: 'TSHC Legal',
  // Points to the Vite build output folder
  webDir: 'dist',

  server: {
    // Allow navigation to the Render backend so the WebView can make requests
    allowNavigation: [
      // Replace with your actual Render backend hostname
      '*.onrender.com',
      'hugtbhdqcxjumljglbnc.supabase.co',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e293b',      // slate-800 — matches the app theme
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      style: 'Dark',                    // white text on dark background
      backgroundColor: '#1e293b',
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  android: {
    // Required to allow HTTP calls to localhost during development
    allowMixedContent: true,
  },

  ios: {
    // Enables WKWebView content access policies
    contentInset: 'automatic',
  },
};

export default config;
