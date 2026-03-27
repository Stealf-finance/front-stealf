import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn } from '../../hooks/auth/useSignIn';
import { useMWAAvailability } from '../../hooks/useMWAAvailability';
import { useWalletAuth } from '../../hooks/useWalletAuth';

interface SignInScreenProps {
  onSwitchToSignUp?: () => void;
  onAuthStart?: () => void;
}

export default function SignInScreen({ onSwitchToSignUp, onAuthStart }: SignInScreenProps = {}) {
  const { loading, signInWithPasskey } = useSignIn();
  const { isMWAAvailable } = useMWAAvailability();
  const walletAuth = useWalletAuth();

  const handleSignIn = async () => {
    onAuthStart?.();
    const result = await signInWithPasskey();

    if (!result.success) {
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
    }
  };

  const handleWalletSignIn = async () => {
    const result = await walletAuth.signInWithWallet();

    if (!result.success) {
      if (result.notFound) {
        Alert.alert(
          'No Account Found',
          'No account is linked to this wallet. Would you like to sign up?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: onSwitchToSignUp },
          ]
        );
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Modal visible={walletAuth.loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingOverlayText}>Connecting...</Text>
        </View>
      </Modal>

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
              source={require('../../assets/logo-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your passkey</Text>

          {/* Passkey Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Sign In with Passkey</Text>
            )}
          </TouchableOpacity>

          {/* Wallet Sign In Button (Android MWA only) */}
          {isMWAAvailable && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.walletButton, walletAuth.loading && styles.buttonDisabled]}
                onPress={handleWalletSignIn}
                disabled={walletAuth.loading}
                activeOpacity={0.8}
              >
                {walletAuth.loading ? (
                  <ActivityIndicator color="rgba(240, 235, 220, 0.95)" />
                ) : (
                  <Text style={styles.walletButtonText}>Sign in with Wallet</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onSwitchToSignUp}>
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
    color: '#fff',
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
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
    marginHorizontal: 16,
  },
  walletButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletButtonText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: 'rgba(240, 235, 220, 0.95)',
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
    color: '#fff',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
});
