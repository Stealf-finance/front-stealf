import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock: () => Promise<{ success: boolean; error?: string }>;
  username?: string;
}

export default function LockScreen({ onUnlock, username }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'none'>('none');
  const isInitialMount = useRef(true);

  useEffect(() => {
    checkBiometricType();
    // Auto-trigger biometric on mount (without showing error)
    handleUnlock(true);
  }, []);

  const checkBiometricType = async () => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('face');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometricType('fingerprint');
    } else {
      setBiometricType('none');
    }
  };

  const handleUnlock = async (isAutoTrigger = false) => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    if (!isAutoTrigger) {
      setError(null);
    }

    try {
      const result = await onUnlock();
      // Only show error on manual button press, not on auto-trigger
      if (!result.success && result.error && !isAutoTrigger) {
        setError(result.error);
      }
    } catch (err: any) {
      if (!isAutoTrigger) {
        setError(err?.message || 'Authentication failed');
      }
    } finally {
      setIsAuthenticating(false);
      isInitialMount.current = false;
    }
  };

  const getButtonText = () => {
    if (isAuthenticating) return 'Authenticating...';
    if (biometricType === 'face') return 'Unlock with Face ID';
    if (biometricType === 'fingerprint') return 'Unlock with Touch ID';
    return 'Unlock';
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/fond.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>
          Welcome back{username ? `, ${username}` : ''}
        </Text>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
        onPress={() => handleUnlock(false)}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator color="#000000" size="small" />
        ) : (
          <Text style={styles.unlockText}>{getButtonText()}</Text>
        )}
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
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
});
