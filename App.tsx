import './polyfills';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { TURNKEY_CONFIG, TURNKEY_CALLBACKS } from './src/constants/turnkey';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

Asset.loadAsync([
  require('./src/assets/fond.png'),
  require('./src/assets/logo-transparent.png'),
]).catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('./src/assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('./src/assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('./src/assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('./src/assets/font/Sansation/Sansation-Italic.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </TurnkeyProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}