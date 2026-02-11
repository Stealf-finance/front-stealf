import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import AddIcon from '../../assets/buttons/add.svg';
import DepositIcon from '../../assets/buttons/deposit.svg';
import ComebackIcon from '../../assets/buttons/comeback.svg';
import { validateMnemonic } from '../../services/transactionsGuard';

type SetupStep = 'choose' | 'importWallet' | 'showMnemonic';

export type WalletSetupChoice =
  | { mode: 'create'; storage: 'cold' }
  | { mode: 'import'; storage: 'cold'; mnemonic: string };

interface WalletSetupScreenProps {
  onComplete: (choice: WalletSetupChoice) => void;
  loading: boolean;
  generatedMnemonic?: string;
}

export default function WalletSetupScreen({ onComplete, loading, generatedMnemonic }: WalletSetupScreenProps) {
  const [step, setStep] = useState<SetupStep>(generatedMnemonic ? 'showMnemonic' : 'choose');
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);
  const clipboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear clipboard after 60 seconds when private key is copied
  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyMnemonic = async () => {
    if (!generatedMnemonic) return;

    await Clipboard.setStringAsync(generatedMnemonic);
    setCopied(true);

    // Clear clipboard after 60 seconds for security
    clipboardTimeoutRef.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
      setCopied(false);
    }, 60000);

    Alert.alert(
      'Copied',
      'Recovery phrase copied to clipboard. It will be automatically cleared in 60 seconds for security.',
      [{ text: 'OK' }]
    );
  };

  const handleCreateNew = () => {
    onComplete({ mode: 'create', storage: 'cold' });
  };

  const handleImport = () => setStep('importWallet');

  const handleImportComplete = () => {
    if (!importKey.trim()) {
      Alert.alert('Error', 'Please enter your seed phrase');
      return;
    }
    onComplete({ mode: 'import', storage: 'cold', mnemonic: importKey.trim() });
    setImportKey('');
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
        {step === 'importWallet' && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('choose')}>
            <ComebackIcon width={20} height={16} />
          </TouchableOpacity>
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'choose' && (
            <>
              <Text style={styles.title}>Stealf Wallet</Text>
              <Text style={styles.subtitle}>
                Choose how to set up your private wallet
              </Text>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleCreateNew}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={styles.optionIconContainer}>
                  <AddIcon width={24} height={24} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Create new wallet</Text>
                  <Text style={styles.optionDescription}>Generate a brand new wallet</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleImport}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={styles.optionIconContainer}>
                  <DepositIcon width={24} height={24} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Import wallet</Text>
                  <Text style={styles.optionDescription}>Use an existing seed phrase</Text>
                </View>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" style={styles.loader} />
              )}
            </>
          )}

          {step === 'importWallet' && (
            <>
              <Text style={styles.title}>Import Wallet</Text>
              <Text style={styles.subtitle}>
                Enter your seed phrase to import your wallet
              </Text>

              <Text style={styles.screenshotWarning}>
                Do not enter your seed phrase while screen sharing or recording.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Seed Phrase</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your 12 or 24 word seed phrase"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={importKey}
                  onChangeText={(text) => { setImportKey(text); setImportError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  editable={!loading}
                />
              </View>

              {importError ? (
                <Text style={styles.errorText}>{importError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, (!importKey.trim() || loading) && styles.buttonDisabled]}
                onPress={() => {
                  const result = validateMnemonic(importKey.trim());
                  if (!result.valid) {
                    setImportError(result.error || 'Invalid seed phrase');
                    return;
                  }
                  setImportError('');
                  handleImportComplete();
                }}
                activeOpacity={0.7}
                disabled={!importKey.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Import Wallet</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'showMnemonic' && generatedMnemonic && (
            <>
              <Text style={styles.title}>Your Recovery Phrase</Text>
              <Text style={styles.subtitle}>
                Save these 24 words securely. Stealf will not store them.{'\n'}You will not be able to recover them.
              </Text>

              <Text style={styles.screenshotWarning}>
                Do not take screenshots. Write down or copy securely.
              </Text>

              <View style={styles.keyContainer}>
                <Text style={styles.keyText}>{generatedMnemonic}</Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copyButtonCopied]}
                onPress={handleCopyMnemonic}
                activeOpacity={0.7}
              >
                <Text style={styles.copyButtonText}>
                  {copied ? 'Copied (clears in 60s)' : 'Copy to Clipboard'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.warningText}>
                Make sure you have saved your recovery phrase before continuing.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => Alert.alert(
                  'Confirm',
                  'Have you saved your recovery phrase?',
                  [
                    { text: 'No, go back', style: 'cancel' },
                    { text: 'Yes, continue', onPress: () => onComplete({ mode: 'create', storage: 'cold' }) },
                  ]
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>I have saved my recovery phrase</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  optionIconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    fontFamily: 'Sansation-Regular',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,
    color: 'white',
    fontFamily: 'Sansation-Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Sansation-Regular',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loader: {
    marginTop: 24,
  },
  keyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  keyText: {
    fontSize: 13,
    color: 'rgba(240, 235, 220, 0.95)',
    fontFamily: 'Sansation-Regular',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#ff4444',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#ff8844',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  screenshotWarning: {
    fontSize: 12,
    color: '#ff4444',
    fontFamily: 'Sansation-Bold',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonCopied: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  copyButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
  },
});