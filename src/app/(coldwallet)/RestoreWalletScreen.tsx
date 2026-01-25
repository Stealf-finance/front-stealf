/**
 * RestoreWalletScreen - Restore wallet from seed phrase
 *
 * Task 9.1-9.3: Seed phrase input, validation, and wallet restoration
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AppBackground from '../../components/common/AppBackground';
import { coldWalletService } from '../../services/coldWallet';

interface Props {
  onSuccess: (mnemonic: string, publicKey: string) => void;
  onCancel: () => void;
  existingPublicKey?: string; // For comparison with stored address
}

export default function RestoreWalletScreen({ onSuccess, onCancel, existingPublicKey }: Props) {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [derivedPublicKey, setDerivedPublicKey] = useState<string | null>(null);
  const [showAddressMismatch, setShowAddressMismatch] = useState(false);

  const getWordCount = useCallback((text: string): number => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }, []);

  const handleSeedPhraseChange = (text: string) => {
    setSeedPhrase(text.toLowerCase());
    setError('');
    setDerivedPublicKey(null);
    setShowAddressMismatch(false);
  };

  const handleValidate = async () => {
    const normalizedPhrase = seedPhrase.trim().replace(/\s+/g, ' ');
    const wordCount = getWordCount(normalizedPhrase);

    // Check word count
    if (wordCount !== 12 && wordCount !== 24) {
      setError(`La seed phrase doit contenir 12 ou 24 mots (actuellement ${wordCount})`);
      return;
    }

    // Validate mnemonic
    if (!coldWalletService.validateMnemonic(normalizedPhrase)) {
      setError('Seed phrase invalide. Vérifiez l\'orthographe et l\'ordre des mots.');
      return;
    }

    setLoading(true);
    try {
      // Derive keypair
      const { publicKey } = await coldWalletService.deriveKeypair(normalizedPhrase);
      setDerivedPublicKey(publicKey);

      // Check if address matches existing one
      if (existingPublicKey && publicKey !== existingPublicKey) {
        setShowAddressMismatch(true);
      } else {
        // Address matches or no existing address, proceed
        onSuccess(normalizedPhrase, publicKey);
      }
    } catch (err) {
      setError('Erreur lors de la dérivation du wallet. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMismatch = () => {
    if (derivedPublicKey) {
      onSuccess(seedPhrase.trim().replace(/\s+/g, ' '), derivedPublicKey);
    }
  };

  const wordCount = getWordCount(seedPhrase);
  const isValidWordCount = wordCount === 12 || wordCount === 24;

  return (
    <View style={styles.container}>
      <AppBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Restaurer votre wallet</Text>
              <Text style={styles.subtitle}>
                Entrez votre seed phrase de 12 ou 24 mots pour récupérer votre wallet
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                Séparez chaque mot par un espace
              </Text>
            </View>

            {/* Seed Phrase Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.seedInput, error && styles.inputError]}
                placeholder="Entrez votre seed phrase..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={seedPhrase}
                onChangeText={handleSeedPhraseChange}
                multiline
                numberOfLines={4}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textAlignVertical="top"
              />

              {/* Word Counter */}
              <View style={styles.wordCountContainer}>
                <Text style={[
                  styles.wordCount,
                  isValidWordCount ? styles.wordCountValid : styles.wordCountInvalid,
                ]}>
                  {wordCount} / {wordCount > 12 ? 24 : 12} mots
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Address Mismatch Warning */}
            {showAddressMismatch && derivedPublicKey && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Adresse différente</Text>
                <Text style={styles.warningText}>
                  L'adresse dérivée de cette seed phrase est différente de celle enregistrée sur votre compte.
                </Text>
                <View style={styles.addressCompare}>
                  <Text style={styles.addressLabel}>Adresse restaurée :</Text>
                  <Text style={styles.addressValue} numberOfLines={1}>
                    {derivedPublicKey}
                  </Text>
                  <Text style={styles.addressLabel}>Adresse enregistrée :</Text>
                  <Text style={styles.addressValue} numberOfLines={1}>
                    {existingPublicKey}
                  </Text>
                </View>
                <View style={styles.warningButtons}>
                  <TouchableOpacity
                    style={styles.warningButton}
                    onPress={handleConfirmMismatch}
                  >
                    <Text style={styles.warningButtonText}>
                      Utiliser cette seed phrase
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.warningButtonOutline}
                    onPress={() => {
                      setShowAddressMismatch(false);
                      setSeedPhrase('');
                      setDerivedPublicKey(null);
                    }}
                  >
                    <Text style={styles.warningButtonOutlineText}>
                      Essayer une autre
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Validate Button */}
            {!showAddressMismatch && (
              <TouchableOpacity
                style={[styles.button, (!isValidWordCount || loading) && styles.buttonDisabled]}
                onPress={handleValidate}
                disabled={!isValidWordCount || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>Valider</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
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
    lineHeight: 24,
  },
  instructionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  inputContainer: {
    marginBottom: 16,
  },
  seedInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
    minHeight: 120,
  },
  inputError: {
    borderColor: 'rgba(255, 68, 68, 0.5)',
  },
  wordCountContainer: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
  wordCount: {
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  wordCountValid: {
    color: 'rgba(76, 175, 80, 0.8)',
  },
  wordCountInvalid: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: 'rgba(255, 68, 68, 0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    color: 'rgba(255, 193, 7, 0.9)',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    color: 'rgba(255, 193, 7, 0.8)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  addressCompare: {
    marginBottom: 16,
  },
  addressLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginTop: 8,
  },
  addressValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginTop: 4,
  },
  warningButtons: {
    gap: 12,
  },
  warningButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  warningButtonText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
  },
  warningButtonOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  warningButtonOutlineText: {
    color: 'rgba(255, 193, 7, 0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  button: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
});
