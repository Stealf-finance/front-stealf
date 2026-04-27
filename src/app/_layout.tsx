import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { TURNKEY_CONFIG, TURNKEY_CALLBACKS } from '../constants/turnkey';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SessionProvider } from '../contexts/SessionContext';
import { usePendingClaims } from '../hooks/wallet/usePendingClaims';
import { usePendingClaimsForCash } from '../hooks/wallet/usePendingClaimsForCash';
import { SplashProvider, useSplash } from '../contexts/SplashContext';
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineBanner from '../components/OfflineBanner';
import { WelcomeLoader } from '../components/WelcomeLoader';
import { validateEnv } from '../utils/validateEnv';
import Logo from '../assets/logo/logo.svg';
// Note: usePreloadZKeysOnMount moved to (tabs)/privacy.tsx — only loads when
// user visits Privacy tab to avoid blocking cold start with multi-MB ZK keys.

SplashScreen.preventAutoHideAsync();

onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(state.isConnected ?? true))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { splashVisible, splashFading, startFade, hideSplash } = useSplash();
  const router = useRouter();
  const segments = useSegments();

  // ZK preload moved to Privacy tab (lazy-load — keys only needed for
  // Umbra transfers and they're 10-50MB each).
  // usePreloadZKeysOnMount();

  usePendingClaims();
  usePendingClaimsForCash();

  useEffect(() => {
    if (loading) return;

    const inProtectedGroup = segments[0] === '(app)';

    if (isAuthenticated && !inProtectedGroup) {
      router.replace('/(app)/(tabs)');
    } else if (!isAuthenticated && inProtectedGroup) {
      router.replace('/sign-in');
    }
  }, [loading, isAuthenticated, segments, router]);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (!splashVisible || splashFading) return;
    if (!isAuthenticated) return;

    const timer = setTimeout(() => startFade(), 300);
    return () => clearTimeout(timer);
  }, [splashVisible, splashFading, isAuthenticated, startFade]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'none',
        }}
      >
        <Stack.Screen name="(app)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>

      <OfflineBanner />

      {splashVisible && (
        <View style={styles.welcomeOverlay}>
          <WelcomeLoader
            logo={<Logo width={80} height={80} />}
            startOpaque
            fadeOutTrigger={splashFading}
            onFadeOutEnd={hideSplash}
          />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Sansation-Regular': require('../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('../assets/font/Sansation/Sansation-Italic.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        validateEnv();
        await Asset.loadAsync([
          require('../assets/logo/logo-transparent.png'),
        ]);
      } catch (e) {
        if (__DEV__) console.error('Erreur initialisation:', e);
      } finally {
        setAppReady(true);
      }
    }
    if (fontsLoaded || fontError) prepare();
  }, [fontsLoaded, fontError]);

  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
              <SessionProvider>
                <AuthProvider>
                  <SplashProvider>
                    <RootNavigator />
                  </SplashProvider>
                </AuthProvider>
              </SessionProvider>
            </TurnkeyProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
