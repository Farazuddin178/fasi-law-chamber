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
