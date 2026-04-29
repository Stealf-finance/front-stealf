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
import * as SecureStore from 'expo-secure-store';
import { useSplash } from '../contexts/SplashContext';
import { useSignIn } from '../hooks/auth/useSignIn';
import { useMWAAvailability } from '../hooks/useMWAAvailability';
import { useWalletAuth } from '../hooks/useWalletAuth';
import {
  MWA_AUTH_TOKEN_KEY,
  MWA_WALLET_ADDRESS_KEY,
} from '../constants/walletAuth';

export default function SignInScreen() {
  const router = useRouter();
  const { showSplash } = useSplash();
  const { loading, isClientReady, signInWithPasskey } = useSignIn();
  const { isMWAAvailable } = useMWAAvailability();
  const walletAuth = useWalletAuth();
  const buttonDisabled = loading || !isClientReady || walletAuth.loading;

  const handleSignIn = async () => {
    const result = await signInWithPasskey(showSplash);

    if (!result.success) {
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
    }
  };

  const handleSeekerSignIn = async () => {
    // Open the Seed Vault to confirm the user owns a Seeker wallet, then
    // chain straight into the regular passkey login. After Turnkey lands,
    // AuthContext compares the stored MWA address with the user's
    // stealf_wallet from the backend and flags the type as 'mwa' if they
    // match — no backend changes required.
    const connect = await walletAuth.connectWallet();
    if (!connect.success) {
      if (connect.error) Alert.alert('Seeker', connect.error);
      return;
    }
    const result = await signInWithPasskey(showSplash);
    if (!result.success) {
      // Roll back the MWA SecureStore writes — the user never authenticated,
      // so the stored address shouldn't bias subsequent loadAuth checks.
      await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
      await SecureStore.deleteItemAsync(MWA_WALLET_ADDRESS_KEY).catch(() => undefined);
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
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

          {/* Seeker Wallet (Android, MWA-capable wallet installed) */}
          {isMWAAvailable && (
            <TouchableOpacity
              style={[styles.walletButton, buttonDisabled && styles.buttonDisabled]}
              onPress={handleSeekerSignIn}
              disabled={buttonDisabled}
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
  walletButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletButtonText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: '#f1ece1',
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
});
