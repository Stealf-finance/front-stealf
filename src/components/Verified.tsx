import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ComebackIcon from '../assets/buttons/comeback.svg';

import { useAuthFlow } from '../hooks/auth/useSignUp';
import { LinearGradient } from 'expo-linear-gradient';

interface VerifiedScreenProps {
  email: string;
  pseudo: string;
  preAuthToken?: string | null;
  onBack?: () => void;
}

export default function VerifiedScreen({ email, pseudo, preAuthToken, onBack }: VerifiedScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    screenState,
    error,
    errorRetryable,
    createPasskey,
    retryPasskey,
  } = useAuthFlow();

  useEffect(() => {
    createPasskey(email, pseudo, preAuthToken || undefined);
  }, [email]);

  // --- RENDERS ---

  if (screenState === 'passkey') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#000000', '#000000']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Creating your account</Text>
            <Text style={styles.subtitle}>
              Please authenticate with {'\n'}Face ID or Touch ID
            </Text>
            <ActivityIndicator
              size="large"
              color="rgba(240, 235, 220, 0.95)"
              style={styles.loader}
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error state
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        {onBack && (
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 8 }]} onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ComebackIcon width={20} height={16} />
          </TouchableOpacity>
        )}
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>{errorRetryable ? '🔒' : '⚠️'}</Text>
          </View>
          <Text style={styles.errorTitle}>
            {errorRetryable ? 'Face ID Cancelled' : 'Wallet Creation Failed'}
          </Text>
          <Text style={styles.errorText}>{error}</Text>
          {errorRetryable && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => retryPasskey(email, pseudo, preAuthToken || undefined)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  loader: { marginBottom: 32 },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  errorIcon: { fontSize: 56 },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: 'rgba(255, 68, 68, 0.9)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginTop: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
});
