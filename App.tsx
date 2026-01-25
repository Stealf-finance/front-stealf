import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

import React from 'react';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/contexts/AuthContext';
import { PrivateWalletProvider } from './src/contexts/PrivateWalletContext';
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
    <QueryClientProvider client={queryClient}>
      <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
        <AuthProvider>
          <PrivateWalletProvider>
            <AppNavigator />
          </PrivateWalletProvider>
        </AuthProvider>
      </TurnkeyProvider>
    </QueryClientProvider>
  );
}
