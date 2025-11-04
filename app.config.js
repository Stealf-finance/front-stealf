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
      image: "./src/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
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
    }
  }
};
