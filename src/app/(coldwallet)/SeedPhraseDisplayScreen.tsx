/**
 * SeedPhraseDisplayScreen - Displays the generated seed phrase
 *
 * Task 5.1: Show seed phrase with security warnings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AppBackground from '../../components/common/AppBackground';
import { coldWalletService } from '../../services/coldWallet';

interface Props {
  onContinue: (mnemonic: string) => void;
  onBack?: () => void;
  wordCount?: 12 | 24;
}

export default function SeedPhraseDisplayScreen({ onContinue, onBack, wordCount = 12 }: Props) {
  const [mnemonic, setMnemonic] = useState<string>('');
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    generateMnemonic();
  }, []);

  const generateMnemonic = () => {
    setLoading(true);
    try {
      const result = coldWalletService.generateMnemonic(wordCount === 12 ? 128 : 256);
      setMnemonic(result.mnemonic);
      setWords(result.mnemonic.split(' '));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer la seed phrase');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    Alert.alert(
      'Avertissement de sécurité',
      'Copier votre seed phrase dans le presse-papiers peut être risqué. Assurez-vous de la coller dans un endroit sûr et de vider votre presse-papiers après.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Copier',
          onPress: async () => {
            await Clipboard.setStringAsync(mnemonic);
            Alert.alert('Copié', 'Seed phrase copiée dans le presse-papiers');
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!confirmed) {
      Alert.alert(
        'Confirmation requise',
        'Veuillez confirmer que vous avez noté votre seed phrase avant de continuer.'
      );
      return;
    }
    onContinue(mnemonic);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" />
            <Text style={styles.loadingText}>Génération de votre seed phrase...</Text>
          </View>
        </AppBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBackground>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Votre Seed Phrase</Text>
            <Text style={styles.subtitle}>
              Notez ces {wordCount} mots dans l'ordre exact
            </Text>
          </View>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Notez cette phrase et conservez-la en lieu sûr. Elle est la seule façon de récupérer votre wallet.
            </Text>
          </View>

          {/* Critical Warning */}
          <View style={styles.criticalWarning}>
            <Text style={styles.criticalText}>
              Cette phrase ne pourra plus être affichée après cette étape
            </Text>
          </View>

          {/* Seed Phrase Grid */}
          <View style={styles.seedContainer}>
            {words.map((word, index) => (
              <View key={index} style={styles.wordBox}>
                <Text style={styles.wordNumber}>{index + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          {/* Copy Button */}
          <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
            <Text style={styles.copyButtonText}>Copier la seed phrase</Text>
          </TouchableOpacity>

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
              {confirmed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              J'ai noté ma seed phrase en lieu sûr
            </Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.button, !confirmed && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!confirmed}
          >
            <Text style={styles.buttonText}>J'ai noté ma seed phrase</Text>
          </TouchableOpacity>

          {/* Back Button */}
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    color: 'rgba(255, 193, 7, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sansation-Regular',
  },
  criticalWarning: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  criticalText: {
    color: 'rgba(255, 68, 68, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  seedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  wordBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordNumber: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    width: 24,
    fontFamily: 'Sansation-Regular',
  },
  wordText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
  },
  copyButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  copyButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    borderColor: 'rgba(240, 235, 220, 0.95)',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    flex: 1,
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
