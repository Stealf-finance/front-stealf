import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock: () => Promise<{ success: boolean; error?: string }>;
  username?: string;
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
  imageContainer: {
    marginTop: '25%',
    width: SCREEN_WIDTH * 0.95,
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  welcomeText: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: 'Sansation-Bold',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  unlockButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    minWidth: 200,
    alignItems: 'center',
  },
  unlockButtonDisabled: {
    opacity: 0.7,
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
});
