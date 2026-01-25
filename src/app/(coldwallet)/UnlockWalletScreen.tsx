/**
 * UnlockWalletScreen - Unlock the cold wallet with biometrics or password
 *
 * Task 6.1: Display unlock options and handle authentication
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AppBackground from '../../components/common/AppBackground';
import { usePrivateWallet, UnlockResult } from '../../contexts/PrivateWalletContext';

interface Props {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function UnlockWalletScreen({ onSuccess, onCancel }: Props) {
  const {
    state,
    unlock,
    checkBiometrics,
    getRemainingLockoutTime,
  } = usePrivateWallet();

  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'facial' | 'iris' | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    initializeScreen();
  }, []);

  // Update lockout timer
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        const remaining = getRemainingLockoutTime();
        setLockoutSeconds(remaining);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const initializeScreen = async () => {
    // Check biometrics
    const { available, type } = await checkBiometrics();
    setBiometricsAvailable(available && state.authMethod === 'biometric');
    setBiometricType(type);

    // Check lockout
    const remaining = getRemainingLockoutTime();
    setLockoutSeconds(remaining);

    // If biometrics available and not locked out, auto-trigger
    if (available && state.authMethod === 'biometric' && remaining === 0) {
      handleBiometricUnlock();
    } else if (!available || state.authMethod === 'password') {
      setShowPasswordInput(true);
    }
  };

  const getBiometricLabel = (): string => {
    switch (biometricType) {
      case 'facial':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      case 'iris':
        return 'Iris';
      default:
        return 'Biométrie';
    }
  };

  const formatLockoutTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleBiometricUnlock = async () => {
    if (lockoutSeconds > 0) {
      Alert.alert('Verrouillé', `Réessayez dans ${formatLockoutTime(lockoutSeconds)}`);
      return;
    }

    setLoading(true);
    try {
      const result = await unlock('biometric');

      if (result.success) {
        onSuccess();
      } else if ('error' in result) {
        const errorType = result.error;
        switch (errorType) {
          case 'biometric_cancelled':
            // User cancelled, show password option
            setShowPasswordInput(true);
            break;
          case 'biometric_failed':
            Alert.alert(
              'Échec',
              `La reconnaissance a échoué. ${3 - state.biometricFailCount} tentative(s) restante(s).`,
              [
                { text: 'Réessayer', onPress: handleBiometricUnlock },
                { text: 'Utiliser le mot de passe', onPress: () => setShowPasswordInput(true) },
              ]
            );
            break;
          case 'max_attempts':
            Alert.alert(
              'Trop de tentatives',
              'Veuillez utiliser votre mot de passe de secours.',
              [{ text: 'OK', onPress: () => setShowPasswordInput(true) }]
            );
            setShowPasswordInput(true);
            break;
          case 'key_invalidated':
            Alert.alert(
              'Biométrie invalidée',
              'Vos données biométriques ont changé. Utilisez votre mot de passe.',
              [{ text: 'OK', onPress: () => setShowPasswordInput(true) }]
            );
            setShowPasswordInput(true);
            break;
          default:
            setShowPasswordInput(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUnlock = async () => {
    if (lockoutSeconds > 0) {
      Alert.alert('Verrouillé', `Réessayez dans ${formatLockoutTime(lockoutSeconds)}`);
      return;
    }

    if (!password) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    try {
      const result = await unlock('password', password);

      if (result.success) {
        onSuccess();
      } else if ('error' in result) {
        const errorType = result.error;
        switch (errorType) {
          case 'password_invalid':
            const remaining = 5 - state.passwordFailCount;
            Alert.alert(
              'Mot de passe incorrect',
              remaining > 0
                ? `${remaining} tentative(s) restante(s) avant verrouillage temporaire.`
                : 'Compte temporairement verrouillé.'
            );
            setPassword('');
            break;
          case 'lockout':
            const lockTime = getRemainingLockoutTime();
            setLockoutSeconds(lockTime);
            Alert.alert(
              'Compte verrouillé',
              `Trop de tentatives échouées. Réessayez dans ${formatLockoutTime(lockTime)}.`
            );
            break;
          default:
            Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.lockIcon}>🔐</Text>
              </View>
              <Text style={styles.title}>Wallet verrouillé</Text>
              <Text style={styles.subtitle}>
                Authentifiez-vous pour accéder à votre wallet privé
              </Text>
            </View>

            {/* Lockout Warning */}
            {lockoutSeconds > 0 && (
              <View style={styles.lockoutBox}>
                <Text style={styles.lockoutText}>
                  Compte temporairement verrouillé
                </Text>
                <Text style={styles.lockoutTimer}>
                  Réessayez dans {formatLockoutTime(lockoutSeconds)}
                </Text>
              </View>
            )}

            {/* Biometric Button */}
            {biometricsAvailable && !showPasswordInput && (
              <TouchableOpacity
                style={[styles.biometricButton, (loading || lockoutSeconds > 0) && styles.buttonDisabled]}
                onPress={handleBiometricUnlock}
                disabled={loading || lockoutSeconds > 0}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.biometricIcon}>
                      {biometricType === 'facial' ? '👤' : '👆'}
                    </Text>
                    <Text style={styles.biometricButtonText}>
                      Déverrouiller avec {getBiometricLabel()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Password Input */}
            {showPasswordInput && (
              <View style={styles.passwordSection}>
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && lockoutSeconds === 0}
                />

                <TouchableOpacity
                  style={[styles.button, (loading || lockoutSeconds > 0 || !password) && styles.buttonDisabled]}
                  onPress={handlePasswordUnlock}
                  disabled={loading || lockoutSeconds > 0 || !password}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.buttonText}>Déverrouiller</Text>
                  )}
                </TouchableOpacity>

                {/* Back to biometric option */}
                {biometricsAvailable && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={() => {
                      setShowPasswordInput(false);
                      setPassword('');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.switchButtonText}>
                      Utiliser {getBiometricLabel()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Use Password Link (when showing biometric) */}
            {biometricsAvailable && !showPasswordInput && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setShowPasswordInput(true)}
                disabled={loading}
              >
                <Text style={styles.switchButtonText}>
                  Utiliser le mot de passe
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </AppBackground>
    </View>
  );
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lockIcon: {
    fontSize: 36,
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
  },
  lockoutBox: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  lockoutText: {
    color: 'rgba(255, 68, 68, 0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
  },
  lockoutTimer: {
    color: 'rgba(255, 68, 68, 0.9)',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
  biometricButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  biometricButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  passwordSection: {
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
    marginBottom: 16,
  },
  button: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
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
  switchButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchButtonText: {
    color: 'rgba(240, 235, 220, 0.95)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
});
