import 'dotenv/config';

export default {
  expo: {
    name: "stealf",
    slug: "stealf",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.jpg",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./src/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.stealf.app",
      adaptiveIcon: {
        foregroundImage: "./src/assets/adaptive-icon.jpg",
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./src/assets/favicon.png"
    },
    plugins: [
      "expo-secure-store"
    ],
    extra: {
      EXPO_PUBLIC_GRID_API_KEY: process.env.EXPO_PUBLIC_GRID_API_KEY,
      EXPO_PUBLIC_GRID_ENV: process.env.EXPO_PUBLIC_GRID_ENV,
      eas: {
        projectId: "3b6fd4ec-789e-42ec-bed6-9d455e096b88"
      }
    }
  }
};
