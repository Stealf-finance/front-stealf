import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type SetupStep = 'choose' | 'createOptions' | 'importWallet' | 'coldWalletResult';

export type WalletSetupChoice =
  | { mode: 'create'; storage: 'turnkey' }
  | { mode: 'create'; storage: 'cold' }
  | { mode: 'import'; storage: 'turnkey'; privateKey: string }
  | { mode: 'import'; storage: 'skip'; privateKey: string };

interface WalletSetupScreenProps {
  onComplete: (choice: WalletSetupChoice) => void;
  loading: boolean;
  coldWalletPrivateKey?: string;
}

export default function WalletSetupScreen({ onComplete, loading, coldWalletPrivateKey }: WalletSetupScreenProps) {
  const [step, setStep] = useState<SetupStep>(coldWalletPrivateKey ? 'coldWalletResult' : 'choose');
  const [importKey, setImportKey] = useState('');

  const handleCreateNew = () => setStep('createOptions');
  const handleImport = () => setStep('importWallet');

  const handleColdWallet = () => {
    onComplete({ mode: 'create', storage: 'cold' });
  };

  const handleSaveInTurnkey = () => {
    onComplete({ mode: 'create', storage: 'turnkey' });
  };

  const handleImportSaveInTurnkey = () => {
    if (!importKey.trim()) {
      Alert.alert('Error', 'Please enter your private key');
      return;
    }
    onComplete({ mode: 'import', storage: 'turnkey', privateKey: importKey.trim() });
  };

  const handleImportSkip = () => {
    if (!importKey.trim()) {
      Alert.alert('Error', 'Please enter your private key');
      return;
    }
    onComplete({ mode: 'import', storage: 'skip', privateKey: importKey.trim() });
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'choose' && (
            <>
              <Text style={styles.title}>Private Wallet</Text>
              <Text style={styles.subtitle}>
                Choose how to set up your private wallet
              </Text>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleCreateNew}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.optionIcon}>+</Text>
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
                <Text style={styles.optionIcon}>↓</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Import wallet</Text>
                  <Text style={styles.optionDescription}>Use an existing private key</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {step === 'createOptions' && (
            <>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep('choose')}>
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Create Wallet</Text>
              <Text style={styles.subtitle}>
                Choose how to store your private wallet
              </Text>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleColdWallet}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.optionIcon}>🔐</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Cold wallet</Text>
                  <Text style={styles.optionDescription}>
                    Your private key is returned to you.{'\n'}Stealf does not store it.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleSaveInTurnkey}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.optionIcon}>🛡️</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Save in Turnkey</Text>
                  <Text style={styles.optionDescription}>
                    Secured by Turnkey infrastructure.{'\n'}Access with your passkey.
                  </Text>
                </View>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" style={styles.loader} />
              )}
            </>
          )}

          {step === 'importWallet' && (
            <>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep('choose')}>
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Import Wallet</Text>
              <Text style={styles.subtitle}>
                Enter your private key to import your wallet
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Private Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your private key"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={importKey}
                  onChangeText={setImportKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleImportSaveInTurnkey}
                activeOpacity={0.7}
                disabled={loading || !importKey.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save in Turnkey</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                onPress={handleImportSkip}
                activeOpacity={0.7}
                disabled={loading || !importKey.trim()}
              >
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'coldWalletResult' && coldWalletPrivateKey && (
            <>
              <Text style={styles.title}>Your Private Key</Text>
              <Text style={styles.subtitle}>
                Save this key securely. Stealf will not store it.{'\n'}You will not be able to recover it.
              </Text>

              <View style={styles.keyContainer}>
                <Text style={styles.keyText} selectable>{coldWalletPrivateKey}</Text>
              </View>

              <Text style={styles.warningText}>
                Make sure you have saved this key before continuing.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => Alert.alert(
                  'Confirm',
                  'Have you saved your private key?',
                  [
                    { text: 'No, go back', style: 'cancel' },
                    { text: 'Yes, continue', onPress: () => onComplete({ mode: 'create', storage: 'cold' }) },
                  ]
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>I have saved my key</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 40,
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
  optionIcon: {
    fontSize: 28,
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
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backLinkText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
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
  warningText: {
    fontSize: 13,
    color: '#ff8844',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
});