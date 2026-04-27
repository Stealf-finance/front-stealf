import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSplash } from '../contexts/SplashContext';
import { useSignIn } from '../hooks/auth/useSignIn';
import { useMWAAvailability } from '../hooks/useMWAAvailability';
import { useWalletAuth } from '../hooks/useWalletAuth';

export default function SignInScreen() {
  const router = useRouter();
  const { showSplash } = useSplash();
  const { loading, isClientReady, signInWithPasskey } = useSignIn();
  const { isMWAAvailable } = useMWAAvailability();
  const walletAuth = useWalletAuth();
  const buttonDisabled = loading || !isClientReady;

  const handleSignIn = async () => {
    const result = await signInWithPasskey(showSplash);

    if (!result.success) {
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
    }
  };

  const handleWalletSignIn = async () => {
    const result = await walletAuth.signInWithWallet();
    if (result.success) return;

    if (result.notFound) {
      Alert.alert(
        'No account found',
        'This Seeker wallet is not linked to a Stealf account yet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.replace('/sign-up') },
        ],
      );
      return;
    }

    if (result.error) {
      Alert.alert('Sign-in failed', result.error);
    }
  };

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo/logo-transparent.png')}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your passkey</Text>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, buttonDisabled && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={buttonDisabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign in with passkey"
          >
            {!isClientReady ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Sign In with Passkey</Text>
            )}
          </TouchableOpacity>

          {/* Seeker Wallet (MWA) — Android only when a compatible wallet is installed */}
          {isMWAAvailable && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.walletButton, walletAuth.loading && styles.buttonDisabled]}
                onPress={handleWalletSignIn}
                disabled={walletAuth.loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Seeker wallet"
              >
                {walletAuth.loading ? (
                  <ActivityIndicator color="#f1ece1" />
                ) : (
                  <Text style={styles.walletButtonText}>Sign In with Seeker Wallet</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/sign-up')} accessibilityRole="button" accessibilityLabel="Sign up">
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Sansation-Bold',
    color: '#f1ece1',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff80',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#f1ece1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff80',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    color: '#f1ece1',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginHorizontal: 12,
  },
  walletButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(241, 236, 225, 0.4)',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletButtonText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: '#f1ece1',
  },
});
