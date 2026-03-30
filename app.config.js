import 'dotenv/config';

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
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.stealf.app",
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
