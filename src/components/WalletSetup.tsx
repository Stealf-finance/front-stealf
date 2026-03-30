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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { validateMnemonic } from '../services/solana/transactionsGuard';
import ComebackIcon from '../assets/buttons/comeback.svg';

type SetupStep = 'choose' | 'importWallet' | 'showMnemonic';

export type WalletSetupChoice =
  | { mode: 'create'; storage: 'cold' }
  | { mode: 'import'; storage: 'cold'; mnemonic: string };

interface WalletSetupScreenProps {
  onComplete: (choice: WalletSetupChoice) => void;
  onCancel?: () => void;
  loading: boolean;
  generatedMnemonic?: string;
}

export default function WalletSetupScreen({ onComplete, onCancel, loading, generatedMnemonic }: WalletSetupScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<SetupStep>(generatedMnemonic ? 'showMnemonic' : 'choose');
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);
  const clipboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (generatedMnemonic) {
      setStep('showMnemonic');
    }
  }, [generatedMnemonic]);

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
    clipboardTimeoutRef.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
      setCopied(false);
    }, 5000);
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
        {/* Back button — fixed at top */}
        {step !== 'choose' && (
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 60 }]} onPress={() => { setStep('choose'); onCancel?.(); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* --- Choose --- */}
          {step === 'choose' && (
            <>
              <Text style={styles.title}>Privacy Wallet</Text>
              <Text style={styles.subtitle}>
                Set up your private wallet to start using Stealf Privacy
              </Text>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => onComplete({ mode: 'create', storage: 'cold' })}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Create new wallet"
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="add-circle-outline" size={24} color="white" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Create new wallet</Text>
                  <Text style={styles.optionDesc}>Generate a brand new wallet</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setStep('importWallet')}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Import wallet"
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="download-outline" size={24} color="white" />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Import wallet</Text>
                  <Text style={styles.optionDesc}>Use an existing seed phrase</Text>
                </View>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" style={{ marginTop: 24 }} />
              )}
            </>
          )}

          {/* --- Import --- */}
          {step === 'importWallet' && (
            <>
              <Text style={styles.title}>Import Wallet</Text>
              <Text style={styles.subtitle}>
                Enter your seed phrase to restore your wallet
              </Text>

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
                accessibilityLabel="Seed phrase"
              />

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
                  onComplete({ mode: 'import', storage: 'cold', mnemonic: importKey.trim() });
                  setImportKey('');
                }}
                activeOpacity={0.7}
                disabled={!importKey.trim() || loading}
                accessibilityRole="button"
                accessibilityLabel="Import wallet"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Import Wallet</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* --- Show Mnemonic --- */}
          {step === 'showMnemonic' && generatedMnemonic && (
            <>
              <Text style={styles.title}>Recovery Phrase</Text>
              <Text style={styles.subtitle}>
                Save these words securely.{'\n'}You won't be able to recover them later.
              </Text>

              <View style={styles.mnemonicBox}>
                <Text style={styles.mnemonicText}>{generatedMnemonic}</Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copyButtonCopied]}
                onPress={handleCopyMnemonic}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Copy recovery phrase"
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copied ? '#4ADE80' : 'rgba(255,255,255,0.8)'}
                />
                <Text style={[styles.copyButtonText, copied && { color: '#4ADE80' }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                accessibilityRole="button"
                accessibilityLabel="Confirm recovery phrase saved"
                onPress={() => Alert.alert(
                  'Confirm',
                  'Have you saved your recovery phrase? You won\'t be able to see it again.',
                  [
                    { text: 'Not yet', style: 'cancel' },
                    { text: 'Yes, continue', onPress: () => onComplete({ mode: 'create', storage: 'cold' }) },
                  ]
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>I've saved my recovery phrase</Text>
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
  container: { flex: 1 },
  background: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    color: 'rgba(255, 255, 255, 0.5)',
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
    borderCurve: 'continuous',
    padding: 20,
    marginBottom: 16,
  },
  optionIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Sansation-Regular',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,
    color: 'white',
    fontFamily: 'Sansation-Regular',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  mnemonicBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    marginBottom: 20,
  },
  mnemonicText: {
    fontSize: 14,
    color: 'rgba(240, 235, 220, 0.9)',
    fontFamily: 'Sansation-Regular',
    lineHeight: 22,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 32,
  },
  copyButtonCopied: {},
  copyButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
  },
  primaryButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    borderCurve: 'continuous',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  buttonDisabled: { opacity: 0.5 },
  errorText: {
    fontSize: 13,
    color: '#ff4444',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
});
