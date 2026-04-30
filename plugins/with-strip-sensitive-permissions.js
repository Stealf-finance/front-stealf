/**
 * Expo config plugin: strip Android permissions that leak into release builds
 * from third-party / debug manifests. Specifically, react-native ships a
 * SYSTEM_ALERT_WINDOW declaration in its debug manifest (used by the dev
 * settings overlay) that some Gradle configs merge into release builds even
 * though it is unused at runtime. The Solana dApp Store flags it as a
 * sensitive permission for a banking app — we don't need it, so override the
 * manifest merger with `tools:node="remove"`.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_STRIP = [
  'android.permission.SYSTEM_ALERT_WINDOW',
];

module.exports = function withStripSensitivePermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure the tools namespace is declared so `tools:node="remove"` resolves.
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    manifest['uses-permission'] = manifest['uses-permission'] || [];

    for (const name of PERMISSIONS_TO_STRIP) {
      // Drop any existing declaration of the permission so we control the
      // final state explicitly.
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (p) => p.$ && p.$['android:name'] !== name,
      );
      // Re-add it with the merger override so the manifest merger strips it
      // from the merged release manifest regardless of what dependencies say.
      manifest['uses-permission'].push({
        $: {
          'android:name': name,
          'tools:node': 'remove',
        },
      });
    }

    return cfg;
  });
};
