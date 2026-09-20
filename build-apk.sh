#!/usr/bin/env bash
# RockMin ID - Automated Android APK & Google Play Bundle Builder
# Created for Kishan Tiwari (kishangeo.github.io)

set -e

echo "======================================================="
echo "  RockMin ID - Android APK & Play Store Build Engine   "
echo "======================================================="

echo "[1/4] Building production web assets via Vite..."
npm run build

echo "[2/4] Verifying Capacitor dependencies..."
if ! command -v npx &> /dev/null; then
    echo "Error: npx is required but not found in PATH."
    exit 1
fi

echo "[3/4] Ensuring @capacitor packages are installed..."
npm install --no-audit --prefer-offline @capacitor/core @capacitor/cli @capacitor/android || true

echo "[4/4] Syncing assets to Android platform..."
if [ ! -d "android" ]; then
    echo "Adding Android platform..."
    npx cap add android
fi

npx cap sync android

echo "======================================================="
echo "✓ Sync complete! Android project is ready."
echo "To generate the standalone debug APK directly:"
echo "  cd android && ./gradlew assembleDebug"
echo "Output APK will be located at:"
echo "  android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To open in Android Studio for Google Play .AAB release signing:"
echo "  npx cap open android"
echo "======================================================="
