import 'dotenv/config';

// Arbitrary HTTP is only allowed outside production (dev server, LAN devices,
// Hermes debugger). Production builds are HTTPS-only to prevent MITM on auth
// tokens and wallet data. Toggle via APP_VARIANT=production in EAS profile.
const isProduction = process.env.APP_VARIANT === 'production';

export default {
  expo: {
    name: "stealf",
    slug: "stealf",
    scheme: "stealf",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./src/assets/logo/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.stealf.app",
      associatedDomains: ["webcredentials:stealf.xyz"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: !isProduction,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.stealf.app",
      // Forbid cleartext HTTP in production (explicit; matches iOS ATS posture).
      // Android SDK 28+ already blocks cleartext by default, but being
      // explicit protects against future targetSdk downgrades or config drift.
      usesCleartextTraffic: !isProduction,
      adaptiveIcon: {
        foregroundImage: "./src/assets/logo/logo-transparent.png",
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: {
            scheme: "https",
            host: "localhost"
          }
        }
      ]
    },
    web: {
      favicon: "./src/assets/logo-transparent.png",
      bundler: "metro"
    },
    plugins: [
      "expo-secure-store",
      ["expo-router", { root: "src/app" }]
    ],
    extra: {
      eas: {
        projectId: "9a158029-d062-48ff-b7b7-33854514570f"
      }
    },
  }
};
