/**
 * SeedPhraseVerifyScreen - Verifies the user has correctly noted the seed phrase
 *
 * Task 5.2: Verify 3 random words from the seed phrase
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AppBackground from '../../components/common/AppBackground';
import { coldWalletService } from '../../services/coldWallet';

interface Props {
  mnemonic: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function SeedPhraseVerifyScreen({ mnemonic, onSuccess, onBack }: Props) {
  const [verificationData, setVerificationData] = useState<{
    indices: number[];
    expectedWords: string[];
  } | null>(null);
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [errors, setErrors] = useState<boolean[]>([false, false, false]);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    generateVerification();
  }, []);

  const generateVerification = () => {
    const data = coldWalletService.selectVerificationWords(mnemonic, 3);
    setVerificationData(data);
    setInputs(['', '', '']);
    setErrors([false, false, false]);
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = value.toLowerCase().trim();
    setInputs(newInputs);

    // Clear error when typing
    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = false;
      setErrors(newErrors);
    }
  };

  const handleVerify = () => {
    if (!verificationData) return;

    const result = coldWalletService.verifyWords(inputs, verificationData.expectedWords);

    if (result.valid) {
      onSuccess();
    } else {
      setAttempts(prev => prev + 1);

      // Mark incorrect inputs
      const newErrors = inputs.map((_, index) => result.incorrectIndices.includes(index));
      setErrors(newErrors);

      if (attempts >= 2) {
        Alert.alert(
          'Vérification échouée',
          'Vous avez fait plusieurs erreurs. Voulez-vous revoir votre seed phrase ?',
          [
            { text: 'Réessayer', onPress: generateVerification },
            { text: 'Revoir la seed phrase', onPress: onBack },
          ]
        );
      } else {
        Alert.alert(
          'Mots incorrects',
          'Un ou plusieurs mots sont incorrects. Vérifiez votre seed phrase et réessayez.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const isComplete = inputs.every(input => input.length > 0);

  if (!verificationData) {
    return null;
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
              <Text style={styles.title}>Vérification</Text>
              <Text style={styles.subtitle}>
                Entrez les mots demandés pour confirmer que vous avez bien noté votre seed phrase
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                Entrez les mots aux positions indiquées
              </Text>
            </View>

            {/* Input Fields */}
            <View style={styles.inputsContainer}>
              {verificationData.indices.map((wordIndex, inputIndex) => (
                <View key={inputIndex} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mot #{wordIndex + 1}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors[inputIndex] && styles.inputError,
                    ]}
                    placeholder={`Entrez le mot #${wordIndex + 1}`}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={inputs[inputIndex]}
                    onChangeText={(value) => handleInputChange(inputIndex, value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                  />
                  {errors[inputIndex] && (
                    <Text style={styles.errorText}>Mot incorrect</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.button, !isComplete && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={!isComplete}
            >
              <Text style={styles.buttonText}>Vérifier</Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Revoir la seed phrase</Text>
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
    justifyContent: 'center',
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
  instructionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  inputsContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
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
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  inputError: {
    borderColor: 'rgba(255, 68, 68, 0.5)',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
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
