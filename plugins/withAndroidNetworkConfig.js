const { withAndroidManifest, AndroidConfig, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to enable HTTP cleartext traffic on Android
 *
 * This plugin:
 * 1. Sets usesCleartextTraffic="true" in AndroidManifest.xml
 * 2. Copies network_security_config.xml to res/xml/
 * 3. Links network_security_config.xml in AndroidManifest.xml
 *
 * Required for making HTTP requests to backend (18.207.238.14:3001)
 * on Android 9+ which blocks cleartext traffic by default.
 */
function withAndroidNetworkConfig(config) {
  // Step 1: Modify AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // Enable cleartext (HTTP) traffic
    mainApplication.$['android:usesCleartextTraffic'] = 'true';

    // Link to network security config XML
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    console.log('✅ Android network config plugin applied');
    console.log('   - usesCleartextTraffic: true');
    console.log('   - networkSecurityConfig: @xml/network_security_config');

    return config;
  });

  // Step 2: Copy network_security_config.xml to res/xml/
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceXml = path.join(projectRoot, 'android-network-config.xml');
      const androidResXml = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      const targetXml = path.join(androidResXml, 'network_security_config.xml');

      // Create res/xml directory if it doesn't exist
      if (!fs.existsSync(androidResXml)) {
        fs.mkdirSync(androidResXml, { recursive: true });
      }

      // Copy network security config XML
      if (fs.existsSync(sourceXml)) {
        fs.copyFileSync(sourceXml, targetXml);
        console.log('✅ Copied network_security_config.xml to res/xml/');
      } else {
        console.warn('⚠️  android-network-config.xml not found at project root');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidNetworkConfig;
