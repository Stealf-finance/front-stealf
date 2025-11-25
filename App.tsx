// IMPORTANT: Polyfills must be imported FIRST before anything else
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer global for Solana SDK compatibility
global.Buffer = Buffer;

// Add process polyfill for Node.js compatibility
if (typeof global.process === 'undefined') {
  global.process = { env: {} } as any;
}

// Add TextEncoder/TextDecoder polyfills if not available
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

import React from 'react';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

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
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
