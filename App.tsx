import './polyfills';
import React, { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView, } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import { SessionProvider } from './src/contexts/SessionContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { TURNKEY_CONFIG, TURNKEY_CALLBACKS } from './src/constants/turnkey';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { validateEnv } from './src/utils/validateEnv';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

export default function App() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Sansation-Regular': require('./src/assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('./src/assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('./src/assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('./src/assets/font/Sansation/Sansation-Italic.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        validateEnv();

        await Asset.loadAsync([
          require('./src/assets/fond.png'),
          require('./src/assets/logo-transparent.png'),
        ]);
      } catch (e) {
        if (__DEV__) console.error('Erreur initialisation:', e);
      } finally {
        setAppReady(true);
      }
    }

    if (fontsLoaded || fontError) {
      prepare();
    }
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady && Platform.OS !== 'web') {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
            <AuthProvider>
              <SessionProvider>
                <AppNavigator />
              </SessionProvider>
            </AuthProvider>
          </TurnkeyProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}