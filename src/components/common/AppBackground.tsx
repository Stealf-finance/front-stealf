import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

interface AppBackgroundProps {
  children: React.ReactNode;
}

export default function AppBackground({ children }: AppBackgroundProps) {
  return (
    <LinearGradient
      colors={['#000000', '#0a0a0a', '#1a1a1a']}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.background}
    >
      <StatusBar style="light" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
