package com.stealf.app

import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)

    // DEBUG: Log network security configuration
    try {
      val appInfo = packageManager.getApplicationInfo(packageName, 0)
      Log.d("NetworkConfig", "=== NETWORK CONFIGURATION DEBUG ===")
      Log.d("NetworkConfig", "usesCleartextTraffic: ${appInfo.flags and android.content.pm.ApplicationInfo.FLAG_USES_CLEARTEXT_TRAFFIC != 0}")
      Log.d("NetworkConfig", "Android Version: ${Build.VERSION.SDK_INT} (${Build.VERSION.RELEASE})")
      Log.d("NetworkConfig", "Package: $packageName")

      // Check if network_security_config.xml exists in resources
      try {
        val resId = resources.getIdentifier("network_security_config", "xml", packageName)
        Log.d("NetworkConfig", "network_security_config.xml resource ID: $resId")
        if (resId != 0) {
          Log.d("NetworkConfig", "✅ network_security_config.xml FOUND in APK")
        } else {
          Log.e("NetworkConfig", "❌ network_security_config.xml NOT FOUND in APK")
        }
      } catch (e: Exception) {
        Log.e("NetworkConfig", "Error checking network_security_config.xml: ${e.message}")
      }

      Log.d("NetworkConfig", "===================================")
    } catch (e: Exception) {
      Log.e("NetworkConfig", "Error logging network config: ${e.message}")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
