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
  config = withAndroidManifest(config, (config) => {
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
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceXml = path.join(projectRoot, 'android-network-config.xml');
      const platformProjectRoot = config.modRequest.platformProjectRoot;

      // EAS Build may not have platformProjectRoot in the same structure
      const androidResXml = path.join(
        platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      const targetXml = path.join(androidResXml, 'network_security_config.xml');

      console.log('🔧 Plugin execution:');
      console.log('   projectRoot:', projectRoot);
      console.log('   platformProjectRoot:', platformProjectRoot);
      console.log('   sourceXml:', sourceXml);
      console.log('   targetXml:', targetXml);

      // Create res/xml directory if it doesn't exist
      if (!fs.existsSync(androidResXml)) {
        console.log('📁 Creating directory:', androidResXml);
        fs.mkdirSync(androidResXml, { recursive: true });
      }

      // Copy network security config XML
      if (fs.existsSync(sourceXml)) {
        fs.copyFileSync(sourceXml, targetXml);
        console.log('✅ Copied network_security_config.xml to res/xml/');
        console.log('   Source:', sourceXml);
        console.log('   Target:', targetXml);
      } else {
        console.error('❌ android-network-config.xml not found at project root');
        console.error('   Expected location:', sourceXml);
        throw new Error('android-network-config.xml not found at project root');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidNetworkConfig;
