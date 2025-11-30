#!/bin/bash

echo "🔧 EAS Build Post-Install Hook - Applying Android network configuration..."

# Paths
PROJECT_ROOT=$(pwd)
ANDROID_MANIFEST="$PROJECT_ROOT/android/app/src/main/AndroidManifest.xml"
NETWORK_CONFIG_SOURCE="$PROJECT_ROOT/android/app/src/main/res/xml/network_security_config.xml"
MAIN_ACTIVITY="$PROJECT_ROOT/android/app/src/main/java/com/stealf/app/MainActivity.kt"

# Check if files exist
if [ ! -f "$ANDROID_MANIFEST" ]; then
  echo "❌ AndroidManifest.xml not found at $ANDROID_MANIFEST"
  exit 1
fi

if [ ! -f "$NETWORK_CONFIG_SOURCE" ]; then
  echo "❌ network_security_config.xml not found at $NETWORK_CONFIG_SOURCE"
  exit 1
fi

if [ ! -f "$MAIN_ACTIVITY" ]; then
  echo "❌ MainActivity.kt not found at $MAIN_ACTIVITY"
  exit 1
fi

echo "✅ All required files found"
echo "✅ AndroidManifest.xml: $ANDROID_MANIFEST"
echo "✅ network_security_config.xml: $NETWORK_CONFIG_SOURCE"
echo "✅ MainActivity.kt: $MAIN_ACTIVITY"
echo ""
echo "📋 Verifying AndroidManifest.xml contains network config..."
grep -q 'android:usesCleartextTraffic="true"' "$ANDROID_MANIFEST" && echo "  ✅ usesCleartextTraffic found" || echo "  ❌ usesCleartextTraffic NOT found"
grep -q 'android:networkSecurityConfig="@xml/network_security_config"' "$ANDROID_MANIFEST" && echo "  ✅ networkSecurityConfig found" || echo "  ❌ networkSecurityConfig NOT found"
echo ""
echo "📋 Verifying MainActivity.kt contains debug logs..."
grep -q 'Log.d("NetworkConfig"' "$MAIN_ACTIVITY" && echo "  ✅ NetworkConfig logs found" || echo "  ❌ NetworkConfig logs NOT found"
echo ""
echo "🎉 EAS Build Post-Install Hook completed successfully!"
