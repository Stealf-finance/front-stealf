import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock: () => Promise<{ success: boolean; error?: string }>;
  username?: string;
}

export default function LockScreen({ onUnlock, username }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Image
          source={require('../../assets/fond.png')}
          style={styles.image}
          resizeMode="contain"
        />
        {username && (
          <Text style={styles.welcomeText}>Welcome back, {username}</Text>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
        onPress={handleUnlock}
        disabled={isAuthenticating}
      >
        <Text style={styles.unlockText}>
          {isAuthenticating ? 'Authenticating...' : 'Unlock with Face ID'}
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
    opacity: 0.6,
  },
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
});
