# Running TSHC Legal as a mobile app

The project is a Capacitor app: the same React build that runs on the web is
packaged inside a native Android shell. `android/` is committed, so you do not
need to run `cap add` again.

## Why it did not work on mobile before

`src/lib/api.ts` returned the placeholder `https://your-app-name.onrender.com`
for the native case. It was never replaced with a real hostname, so every
backend call from the app resolved to a domain that does not exist. On the web
the app takes a different branch (same-origin), which is why the website worked
while the app did not. It now points at `https://fasi-law-chamber.onrender.com`,
the service defined in `render.yaml`.

## Why the app crashed on launch after logging in

`useCapacitorPush` runs as soon as a user id exists, and `AuthContext` restores
the saved user from `localStorage` on boot. So once you had logged in
successfully, every later launch called `PushNotifications.register()` during
startup.

On Android that goes through Firebase Cloud Messaging. With no
`android/app/google-services.json`, FCM throws *"Default FirebaseApp is not
initialized in this process"* as a **native** exception, which kills the app
process — a JavaScript `try/catch` cannot stop it. The app appeared to open and
then instantly close, every time.

Native push is therefore **off by default** now. The app runs normally without
it; you simply get no push notifications.

### Enabling push later

1. Create a Firebase project and register the Android app with the applicationId
   `com.tshclegal.app`.
2. Download `google-services.json` and put it in `android/app/`.
3. Build with the flag set, then re-sync:
   ```bash
   VITE_ENABLE_PUSH=true pnpm run cap:sync
   ```

Skip any of these and push stays disabled — deliberately, so a missing config
can never crash the app again.

## Phone notifications

There were two separate reasons nothing reached the notification shade.

**1. The app used a browser-only API (fixed).**
Notifications were raised with `new Notification(...)`, the Web Notification
API. An Android WebView does not implement it, so `'Notification' in window` was
false and every one of those calls was skipped — the in-app bell updated and the
phone stayed silent. All call sites now go through `src/lib/notify.ts`, which
uses `@capacitor/local-notifications` on the device. `POST_NOTIFICATIONS` is
declared in the manifest and requested at login, which Android 13+ requires.

**2. The server never sends push (still open).**
`/api/notifications/send-push` in `notification_routes.py` is a placeholder that
logs the request and returns success. Nothing is delivered.

### What works now vs. what needs Firebase

| | App open / backgrounded | App fully closed |
|---|---|---|
| Now (local notifications) | ✅ appears on your phone | ❌ nothing |
| With FCM configured | ✅ | ✅ |

Local notifications are raised *by the app*, so the app has to be running.
Instagram-style delivery to a closed app needs a push service pushing to the
device. To finish that:

1. Create a Firebase project, register the Android app with applicationId
   `com.tshclegal.app`, download `google-services.json` into `android/app/`.
2. Rebuild with `VITE_ENABLE_PUSH=true pnpm run cap:sync` so
   `useCapacitorPush` registers and stores a device token in `fcm_tokens`.
3. Implement real sending in `send_push()` — add `firebase-admin` to
   `requirements.txt`, load a service-account key from an env var, and replace
   the placeholder with `messaging.send_each_for_multicast(...)`. The TODO in
   that function sketches the call.

Step 3 was deliberately left undone: it needs credentials that only exist in
your Firebase project, and shipping untested sending code plus a large new
Python dependency would risk the Render build for no benefit until steps 1–2
are done.

## One-time setup

1. Install **Android Studio** (includes the Android SDK and an emulator):
   https://developer.android.com/studio
2. Open Android Studio once and let it finish downloading the SDK.
3. Confirm a JDK is on your PATH — `java -version` should print 17 or newer.

Nothing else is needed; the Gradle wrapper in `android/` fetches its own Gradle.

## Build and run

```bash
# 1. Build the web assets and copy them into the native project
pnpm run cap:sync

# 2. Open the project in Android Studio
pnpm run cap:open:android

# 3. Press Run (or Build > Build APK) and pick a device or emulator
```

To install straight onto a USB-connected phone with USB debugging enabled:

```bash
pnpm run cap:run:android
```

## After changing any web code

Native builds serve a **copy** of `dist/`, so web changes do not appear until
you re-sync:

```bash
pnpm run cap:sync
```

## Pointing the app at a different backend

`VITE_BACKEND_URL` overrides the default for both web and native. Set it before
building:

```bash
VITE_BACKEND_URL=https://your-backend.example.com pnpm run cap:sync
```

## Producing a release APK / AAB

Debug builds are fine for testing on your own device. For Play Store upload you
need a signed release build — in Android Studio: **Build > Generate Signed
Bundle / APK**, create a keystore, and keep it somewhere safe. Losing the
keystore means you cannot ship updates to an already-published app.

## iOS

`@capacitor/ios` is installed but the `ios/` project has not been generated,
because building for iOS requires macOS with Xcode. On a Mac:

```bash
pnpm run cap:add:ios
pnpm run cap:sync
pnpm run cap:open:ios
```
