import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import WalletSetupScreen, { WalletSetupChoice } from './WalletSetupScreen';
import { useAuthFlow } from '../../hooks/useSignUp';
import { LinearGradient } from 'expo-linear-gradient';

interface VerifiedScreenProps {
  email: string;
  pseudo: string;
}

export default function VerifiedScreen({ email, pseudo }: VerifiedScreenProps) {
  const {
    screenState,
    loading,
    error,
    generatedMnemonic,
    createPasskey,
    handleWalletChoice,
    handleMnemonicConfirmed,
  } = useAuthFlow();

  // Step 1: Create passkey on mount
  useEffect(() => {
    createPasskey(email);
  }, [email]);

  // Step 2: Handle wallet setup choice
  const onWalletChoice = async (choice: WalletSetupChoice) => {
    const result = await handleWalletChoice(choice, email, pseudo);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to set up wallet');
    }
  };

  // Step 3: Mnemonic confirmed
  const onMnemonicConfirmed = () => {
    handleMnemonicConfirmed(pseudo);
  };

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

  if (screenState === 'walletSetup' || screenState === 'showMnemonic') {
    return (
      <WalletSetupScreen
        onComplete={screenState === 'showMnemonic' ? onMnemonicConfirmed : onWalletChoice}
        loading={loading}
        generatedMnemonic={generatedMnemonic}
      />
    );
  }

  if (screenState === 'creatingWallet') {
    return <View style={styles.container} />;
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
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Wallet Creation Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
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
});
