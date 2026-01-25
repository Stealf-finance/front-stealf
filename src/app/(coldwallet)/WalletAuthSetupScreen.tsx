/**
 * WalletAuthSetupScreen - Configure authentication for the cold wallet
 *
 * Task 5.3: Setup biometric or password authentication
 */

import React, { useState, useEffect } from 'react';
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
import { usePrivateWallet } from '../../contexts/PrivateWalletContext';
import { coldWalletService } from '../../services/coldWallet';
import { secureStorageService, AuthMethod } from '../../services/coldWallet/secureStorage';

interface Props {
  mnemonic: string;
  onSuccess: (publicKey: string) => void;
  onBack: () => void;
}

export default function WalletAuthSetupScreen({ mnemonic, onSuccess, onBack }: Props) {
  const { createWallet } = usePrivateWallet();

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'facial' | 'iris' | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingBiometrics, setCheckingBiometrics] = useState(true);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    setCheckingBiometrics(true);
    try {
      const available = await secureStorageService.isBiometricsAvailable();
      const type = await secureStorageService.getBiometricType();
      setBiometricsAvailable(available);
      setBiometricType(type);

      // Default to biometric if available
      if (available) {
        setSelectedMethod('biometric');
      } else {
        setSelectedMethod('password');
      }
    } catch (error) {
      setSelectedMethod('password');
    } finally {
      setCheckingBiometrics(false);
    }
  };

  const getBiometricLabel = (): string => {
    switch (biometricType) {
      case 'facial':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID / Empreinte';
      case 'iris':
        return 'Iris';
      default:
        return 'Biométrie';
    }
  };

  const validatePassword = (pwd: string): string[] => {
    const validation = secureStorageService.validatePasswordStrength(pwd);
    return validation.errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      setPasswordErrors(validatePassword(value));
    } else {
      setPasswordErrors([]);
    }
  };

  const handleSetup = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode d\'authentification');
      return;
    }

    // Validate password
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      // Derive keypair from mnemonic
      const { keypair, publicKey } = await coldWalletService.deriveKeypair(mnemonic);

      // Create wallet with selected auth method
      await createWallet(keypair, selectedMethod, password);

      onSuccess(publicKey);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le wallet. Veuillez réessayer.');
      console.error('Wallet creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    selectedMethod !== null &&
    password.length >= 8 &&
    password === confirmPassword &&
    passwordErrors.length === 0;

  if (checkingBiometrics) {
    return (
      <View style={styles.container}>
        <AppBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" />
            <Text style={styles.loadingText}>Vérification des options de sécurité...</Text>
          </View>
        </AppBackground>
      </View>
    );
  }

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
              <Text style={styles.title}>Sécurisez votre wallet</Text>
              <Text style={styles.subtitle}>
                Choisissez comment vous souhaitez protéger l'accès à votre wallet privé
              </Text>
            </View>

            {/* Auth Method Selection */}
            <View style={styles.methodsContainer}>
              {biometricsAvailable && (
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedMethod === 'biometric' && styles.methodCardSelected,
                  ]}
                  onPress={() => setSelectedMethod('biometric')}
                >
                  <View style={styles.methodIcon}>
                    <Text style={styles.methodIconText}>
                      {biometricType === 'facial' ? '👤' : '👆'}
                    </Text>
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>{getBiometricLabel()}</Text>
                    <Text style={styles.methodDescription}>
                      Déverrouillez rapidement avec votre {biometricType === 'facial' ? 'visage' : 'empreinte'}
                    </Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedMethod === 'biometric' && styles.radioButtonSelected,
                  ]}>
                    {selectedMethod === 'biometric' && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  selectedMethod === 'password' && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethod('password')}
              >
                <View style={styles.methodIcon}>
                  <Text style={styles.methodIconText}>🔒</Text>
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Mot de passe uniquement</Text>
                  <Text style={styles.methodDescription}>
                    Utilisez un mot de passe pour déverrouiller
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedMethod === 'password' && styles.radioButtonSelected,
                ]}>
                  {selectedMethod === 'password' && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Password Section */}
            <View style={styles.passwordSection}>
              <Text style={styles.sectionTitle}>
                {selectedMethod === 'biometric'
                  ? 'Mot de passe de secours'
                  : 'Créez votre mot de passe'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {selectedMethod === 'biometric'
                  ? 'Ce mot de passe sera utilisé si la biométrie échoue'
                  : 'Ce mot de passe protégera votre wallet'}
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, passwordErrors.length > 0 && styles.inputError]}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {passwordErrors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    {passwordErrors.map((error, index) => (
                      <Text key={index} style={styles.errorText}>• {error}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.input,
                    confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
                  ]}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
                )}
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
              onPress={handleSetup}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Créer mon wallet</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
              <Text style={styles.backButtonText}>Retour</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  methodsContainer: {
    marginBottom: 32,
  },
  methodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: 'rgba(240, 235, 220, 0.5)',
    backgroundColor: 'rgba(240, 235, 220, 0.05)',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  methodDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: 'rgba(240, 235, 220, 0.95)',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
  },
  passwordSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  inputError: {
    borderColor: 'rgba(255, 68, 68, 0.5)',
  },
  errorsContainer: {
    marginTop: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginBottom: 2,
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
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
});
