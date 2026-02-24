import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Preload image at module level for instant display
const LOCK_SCREEN_IMAGE = require('../../assets/fond.png');
Image.prefetch(Image.resolveAssetSource(LOCK_SCREEN_IMAGE).uri).catch(() => {});

interface LockScreenProps {
  onUnlock: () => Promise<{ success: boolean; error?: string }>;
  username?: string;
}

export default function LockScreen({ onUnlock, username }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then(types => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricLabel('Touch ID');
      }
    });
  }, []);

  const handleUnlock = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      // Delegate biometric auth to SessionContext's unlockWithAuth
      const result = await onUnlock();

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        <Image
          source={LOCK_SCREEN_IMAGE}
          style={[styles.image, !imageLoaded && styles.imageHidden]}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
        />
        {imageLoaded && username && (
          <Text style={styles.welcomeText}>Welcome back, {username}</Text>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {imageLoaded && (
        <TouchableOpacity
          style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={isAuthenticating}
        >
          <Text style={styles.unlockText}>
            {isAuthenticating ? 'Authenticating...' : `Unlock with ${biometricLabel}`}
          </Text>
        </TouchableOpacity>
      )}
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
  imageHidden: {
    opacity: 0,
    position: 'absolute',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
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
    opacity: 0.6,
  },
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
});
