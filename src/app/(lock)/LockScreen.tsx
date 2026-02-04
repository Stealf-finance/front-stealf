import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const handleBiometricAuth = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Stealf',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      } else if (result.error === 'user_cancel') {
        // User cancelled, do nothing
      } else {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } catch (error) {
      if (__DEV__) console.error('Biometric auth error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUnlock = () => {
    if (biometricAvailable) {
      handleBiometricAuth();
    } else {
      // Fallback for devices without biometrics
      onUnlock();
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/fond.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
        onPress={handleUnlock}
        disabled={isAuthenticating}
      >
        <Text style={styles.unlockText}>
          {isAuthenticating ? 'Authenticating...' : biometricAvailable ? 'Unlock with Face ID' : 'Log in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  image: {
    marginTop: '30%',
    width: SCREEN_WIDTH * 0.95,
    height: undefined,
    aspectRatio: 3 / 4,
    borderRadius: 20,
  },
  unlockButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation',
    fontWeight: '700',
  },
});
