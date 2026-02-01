import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import LoginSuccessAnimation from '../../components/auth/LoginSuccessAnimation';
import { useAuthFlow } from '../../hooks/useSignUp';
import { LinearGradient } from 'expo-linear-gradient';
interface VerifiedScreenProps {
  email: string;
  pseudo: string;
}

export default function VerifiedScreen({ email, pseudo }: VerifiedScreenProps) {
  const authFlow = useAuthFlow();
  const [loading, setLoading] = useState(true);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const createWallet = async () => {
      console.log('Starting wallet creation with Passkey...');

      const result = await authFlow.handleMagicLinkVerified({
        email,
        pseudo,
        setLoading,
        setShowLogoAnimation,
      });

      if (!result.success) {
        setError(result.message || 'Failed to create wallet');
        Alert.alert(
          result.message || 'Error',
          result.description || 'Failed to create your wallet. Please try again.'
        );
      }
    };

    createWallet();
  }, [email, pseudo]);

  const handleAnimationComplete = () => {
    setShowLogoAnimation(false);
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
          {loading && !error && (
            <>

              <Text style={styles.title}>Creating your wallet</Text>
              <Text style={styles.subtitle}>
                Please authenticate with {'\n'}Face ID or Touch ID
              </Text>

              <ActivityIndicator
                size="large"
                color="rgba(240, 235, 220, 0.95)"
                style={styles.loader}
              />

              <Text style={styles.infoText}>
                Your wallet is being created securely{'\n'}
                This may take a few moments...
              </Text>
            </>
          )}

          {error && (
            <>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
              </View>

              <Text style={styles.errorTitle}>Wallet Creation Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
            </>
          )}
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
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    fontSize: 56,
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
  loader: {
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
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
  errorIcon: {
    fontSize: 56,
  },
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
});