const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to add network debug logs to MainActivity
 * This plugin modifies MainActivity.kt to log network configuration at startup
 */
function withMainActivityDebugLogs(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const mainActivityPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/stealf/app/MainActivity.kt'
      );

      console.log('📱 Adding debug logs to MainActivity.kt...');
      console.log('   Path:', mainActivityPath);

      if (!fs.existsSync(mainActivityPath)) {
        console.error('❌ MainActivity.kt not found at:', mainActivityPath);
        return config;
      }

      let mainActivityContent = fs.readFileSync(mainActivityPath, 'utf-8');

      // Check if logs already exist
      if (mainActivityContent.includes('NetworkConfig')) {
        console.log('✅ Debug logs already present in MainActivity.kt');
        return config;
      }

      // Add Log import if not present
      if (!mainActivityContent.includes('import android.util.Log')) {
        mainActivityContent = mainActivityContent.replace(
          'import android.os.Bundle',
          'import android.os.Build\nimport android.os.Bundle\nimport android.util.Log'
        );
      }

      // Add debug code in onCreate after super.onCreate(null)
      const debugCode = `
    // DEBUG: Log network security configuration
    try {
      val appInfo = packageManager.getApplicationInfo(packageName, 0)
      Log.d("NetworkConfig", "=== NETWORK CONFIGURATION DEBUG ===")
      Log.d("NetworkConfig", "usesCleartextTraffic: \${appInfo.flags and android.content.pm.ApplicationInfo.FLAG_USES_CLEARTEXT_TRAFFIC != 0}")
      Log.d("NetworkConfig", "Android Version: \${Build.VERSION.SDK_INT} (\${Build.VERSION.RELEASE})")
      Log.d("NetworkConfig", "Package: \$packageName")

      // Check if network_security_config.xml exists in resources
      try {
        val resId = resources.getIdentifier("network_security_config", "xml", packageName)
        Log.d("NetworkConfig", "network_security_config.xml resource ID: \$resId")
        if (resId != 0) {
          Log.d("NetworkConfig", "✅ network_security_config.xml FOUND in APK")
        } else {
          Log.e("NetworkConfig", "❌ network_security_config.xml NOT FOUND in APK")
        }
      } catch (e: Exception) {
        Log.e("NetworkConfig", "Error checking network_security_config.xml: \${e.message}")
      }

      Log.d("NetworkConfig", "===================================")
    } catch (e: Exception) {
      Log.e("NetworkConfig", "Error logging network config: \${e.message}")
    }
`;

      mainActivityContent = mainActivityContent.replace(
        'super.onCreate(null)',
        `super.onCreate(null)
${debugCode}`
      );

      fs.writeFileSync(mainActivityPath, mainActivityContent);
      console.log('✅ Debug logs added to MainActivity.kt');

      return config;
    },
  ]);
}

module.exports = withMainActivityDebugLogs;
