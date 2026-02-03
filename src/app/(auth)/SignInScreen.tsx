import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn } from '../../hooks/useSignIn';

interface SignInScreenProps {
  onSwitchToSignUp?: () => void;
}

export default function SignInScreen({ onSwitchToSignUp }: SignInScreenProps = {}) {
  const {
    loading,
    needsColdWalletImport,
    coldWalletImportError,
    signInWithPasskey,
    handleColdWalletImport,
    skipColdWalletImport,
  } = useSignIn();

  const [mnemonic, setMnemonic] = useState('');

  const handleSignIn = async () => {
    const result = await signInWithPasskey();

    if (!result.success) {
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
    }
  };

  const handleImportWallet = async () => {
    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }

    const result = await handleColdWalletImport(mnemonic.trim());

    if (!result.success) {
      Alert.alert('Import Failed', result.error || 'Failed to import wallet');
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Import?',
      'You can import your privacy wallet later from settings. Some features will be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: skipColdWalletImport },
      ]
    );
  };

  // Cold wallet import screen
  if (needsColdWalletImport) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#000000', '#000000']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.importContent}>
                <Text style={styles.title}>Import Privacy Wallet</Text>
                <Text style={styles.subtitle}>
                  Enter your 12 or 24 word recovery phrase to restore your privacy wallet
                </Text>

                <TextInput
                  style={styles.mnemonicInput}
                  placeholder="Enter your recovery phrase..."
                  placeholderTextColor="#ffffff40"
                  value={mnemonic}
                  onChangeText={setMnemonic}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {coldWalletImportError && (
                  <Text style={styles.errorText}>{coldWalletImportError}</Text>
                )}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleImportWallet}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.buttonText}>Import Wallet</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  disabled={loading}
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }

  // Default sign in screen
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
              source={require('../../assets/logo-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your passkey</Text>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Sign In with Passkey</Text>
            )}
          </TouchableOpacity>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  importContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
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
  mnemonicInput: {
    width: '100%',
    minHeight: 120,
    backgroundColor: '#ffffff10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff20',
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontFamily: 'Sansation-Regular',
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontFamily: 'Sansation-Regular',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
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
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff60',
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
});
