# RockMin ID — Mobile Packaging Guide (Android APK / AAB & iOS IPA)

This document provides turnkey, production-ready instructions for compiling **RockMin ID** into a native **Android APK / Google Play App Bundle (AAB)** and an **iOS IPA / TestFlight / App Store** application.

---

## 1. Quick Direct Installation (Instant PWA Mode on Android & iOS)

RockMin ID is configured as a fully compliant **Progressive Web App (PWA)** with service workers, offline support, maskable icons, and a standalone mobile manifest:

- **On Android**: Open the web app in Google Chrome or Samsung Internet, tap the top **"Install App"** button (or Chrome menu `⋮` > **Install app**). The app installs directly to your home screen and app drawer as an independent app window without browser URL bars.
- **On iOS (iPhone / iPad)**: Open in Safari, tap the **Share** button (box with upward arrow), scroll down and select **"Add to Home Screen"**. It launches full-screen with native iOS status bar theming.

---

## 2. Option A: Build Android APK / AAB using Capacitor (Recommended for Play Store & App Store)

Capacitor wraps the compiled production Vite bundle into native Android Studio and Xcode projects with full offline execution and native API capabilities.

### Prerequisites
- **Node.js 18+** & npm
- **Android Studio** with Android SDK 34+ (for Android APK / AAB)
- **macOS with Xcode 15+** (for iOS build)

### Step 1: Install Capacitor CLI & Core Packages
Run in the project root:
```bash
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android @capacitor/ios
```

### Step 2: Initialize & Build the Web Assets
```bash
# Build the production web distribution
npm run build

# Initialize Capacitor platforms
npx cap add android
npx cap add ios

# Sync compiled web code into native shells
npx cap sync
```

### Step 3: Build Android APK (Debug or Release for Google Play)
```bash
# Open in Android Studio
npx cap open android
```
Inside Android Studio:
1. **To build an instant test APK**:
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The compiled `.apk` will be generated in `android/app/build/outputs/apk/debug/app-debug.apk`.
   - Transfer this file to any Android device or run on an emulator.

2. **To generate a signed `.aab` for Google Play Store**:
   - Go to **Build** > **Generate Signed Bundle / APK**.
   - Select **Android App Bundle (.aab)**.
   - Create or select your keystore, set key alias and password.
   - Choose **release** destination. Upload the resulting `.aab` to Google Play Console.

### Step 4: Build iOS App (Xcode for App Store / TestFlight)
*(Requires a Mac with Xcode installed)*
```bash
# Open in Xcode
npx cap open ios
```
Inside Xcode:
1. Select your target device or **Any iOS Device (arm64)**.
2. In the **Signing & Capabilities** tab, choose your Apple Developer Team and specify your Bundle Identifier (`com.kishantiwari.rockminid`).
3. Click **Product** > **Archive** to bundle and distribute to **TestFlight** or the **Apple App Store**.

---

## 3. Option B: Turnkey Google Play APK using Bubblewrap (Google TWA)

Google's official **Bubblewrap CLI** packages an existing PWA directly into an Android APK / AAB using **Trusted Web Activities (TWA)** with zero native code required:

```bash
# 1. Install Google Bubblewrap
npm install -g @bubblewrap/cli

# 2. Initialize from the hosted manifest
bubblewrap init --manifest=https://your-domain.com/manifest.json

# 3. Build APK and AAB
bubblewrap build
```
Bubblewrap automatically verifies your Digital Asset Links (`assetlinks.json`) and produces a signed Google Play Store `.aab` and installable `.apk`.

---

## 4. App Identifier & Branding Metadata

- **App Name**: `RockMin ID`
- **Package ID (Android)**: `com.kishantiwari.rockminid`
- **Bundle ID (iOS)**: `com.kishantiwari.rockminid`
- **Author**: Kishan Tiwari (`https://kishangeo.github.io`)
- **Category**: Education / Tools / Science
- **Theme Color**: `#1c1917` (Stone Dark)
- **Accent Color**: `#d97706` (Geological Amber)
- **Icons**:
  - `public/icon.svg` (Master high-res vector)
  - `public/pwa-192x192.png` (Standard density)
  - `public/pwa-512x512.png` (High density)
  - `public/pwa-maskable-512x512.png` (Android adaptive safe-zone icon)
  - `public/apple-touch-icon.png` (iOS Safari home screen 180x180)
