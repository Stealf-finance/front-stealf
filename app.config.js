import 'dotenv/config';

export default {
  expo: {
    name: "stealf",
    slug: "stealf",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./src/assets/logo-transparent.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.stealf.app",
      associatedDomains: ["webcredentials:localhost"],
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.stealf.app",
      adaptiveIcon: {
        foregroundImage: "./src/assets/logo-transparent.png",
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
      favicon: "./src/assets/logo-transparent.png"
    },
    plugins: [
      "expo-secure-store"
    ],
  }
};
