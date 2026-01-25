/**
 * ColdWalletSetupScreen - Entry point for cold wallet setup
 *
 * Allows users to create a new wallet or restore from seed phrase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AppBackground from '../../components/common/AppBackground';
import SeedPhraseDisplayScreen from './SeedPhraseDisplayScreen';
import SeedPhraseVerifyScreen from './SeedPhraseVerifyScreen';
import WalletAuthSetupScreen from './WalletAuthSetupScreen';
import RestoreWalletScreen from './RestoreWalletScreen';

type SetupStep = 'choice' | 'display' | 'verify' | 'auth' | 'restore';

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

export default function ColdWalletSetupScreen({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<SetupStep>('choice');
  const [mnemonic, setMnemonic] = useState('');

  const handleCreateNew = () => {
    setStep('display');
  };

  const handleRestore = () => {
    setStep('restore');
  };

  const handleSeedDisplayContinue = (generatedMnemonic: string) => {
    setMnemonic(generatedMnemonic);
    setStep('verify');
  };

  const handleVerificationComplete = () => {
    setStep('auth');
  };

  const handleAuthComplete = (_publicKey: string) => {
    onComplete();
  };

  const handleRestoreComplete = (_mnemonic: string, _publicKey: string) => {
    onComplete();
  };

  const handleBack = () => {
    switch (step) {
      case 'display':
      case 'restore':
        setStep('choice');
        break;
      case 'verify':
        setStep('display');
        break;
      case 'auth':
        setStep('verify');
        break;
      default:
        onCancel?.();
    }
  };

  // Step: Choice
  if (step === 'choice') {
    return (
      <View style={styles.container}>
        <AppBackground>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.walletIcon}>🔒</Text>
              </View>
              <Text style={styles.title}>Cold Wallet</Text>
              <Text style={styles.subtitle}>
                Votre clé privée reste exclusivement sur votre appareil
              </Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Non-custodial & Sécurisé</Text>
              <Text style={styles.infoText}>
                Contrairement aux wallets classiques, personne d'autre que vous n'a accès à vos fonds. Pas même Stealf.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateNew}
              >
                <Text style={styles.primaryButtonText}>Créer un nouveau wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRestore}
              >
                <Text style={styles.secondaryButtonText}>Restaurer avec une seed phrase</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel */}
            {onCancel && (
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </AppBackground>
      </View>
    );
  }

  // Step: Display seed phrase
  if (step === 'display') {
    return (
      <SeedPhraseDisplayScreen
        onContinue={handleSeedDisplayContinue}
        onBack={handleBack}
        wordCount={12}
      />
    );
  }

  // Step: Verify seed phrase
  if (step === 'verify') {
    return (
      <SeedPhraseVerifyScreen
        mnemonic={mnemonic}
        onSuccess={handleVerificationComplete}
        onBack={handleBack}
      />
    );
  }

  // Step: Setup authentication
  if (step === 'auth') {
    return (
      <WalletAuthSetupScreen
        mnemonic={mnemonic}
        onSuccess={handleAuthComplete}
        onBack={handleBack}
      />
    );
  }

  // Step: Restore wallet
  if (step === 'restore') {
    return (
      <RestoreWalletScreen
        onSuccess={handleRestoreComplete}
        onCancel={handleBack}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  walletIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(240, 235, 220, 0.95)',
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    lineHeight: 20,
  },
  buttonsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
});
