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
