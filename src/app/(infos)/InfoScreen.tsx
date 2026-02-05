import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useExportWallet } from '../../hooks/useExportWallet';
import { useAuth } from '../../contexts/AuthContext';

type InfoScreenSource = 'home' | 'privacy';

interface InfoScreenProps {
  onBack: () => void;
  source: InfoScreenSource;
}

export default function InfoScreen({ onBack, source }: InfoScreenProps) {
  const { exportWalletByAddress, exportColdWallet, loading } = useExportWallet();
  const { userData } = useAuth();
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState<string>('');

  const handleExportWallet = async () => {
    if (source === 'home') {
      // Cash wallet - always in Turnkey
      if (!userData?.cash_wallet) {
        return { success: false, error: 'Cash wallet not found' };
      }
      return exportWalletByAddress(userData.cash_wallet);
    } else {
      // Privacy wallet - always stored locally
      return exportColdWallet();
    }
  };

  const getTitle = () => {
    return source === 'home' ? 'Cash Wallet Backup' : 'Privacy Wallet Backup';
  };

  return (
      <LinearGradient
            colors={['#000000', '#000000', '#000000']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.background}
          >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Wallet Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="download-outline" size={22} color="white" />
            <Text style={styles.sectionTitle}>Backup Wallet</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Export your recovery phrase to backup your wallet. Keep it safe and never share it with anyone.
          </Text>

          {/* Warning Card */}
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color="#FFA500" />
            <Text style={styles.warningText}>
              Your recovery phrase gives full access to your wallet. Store it securely offline.
            </Text>
          </View>

          {/* Export Button */}
          {!showMnemonic ? (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={async () => {
                Alert.alert(
                  'Export Recovery Phrase',
                  'Are you sure you want to reveal your recovery phrase? Make sure no one is watching your screen.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Continue',
                      style: 'destructive',
                      onPress: async () => {
                        const result = await handleExportWallet();
                        if (result.success && result.mnemonic) {
                          setMnemonic(result.mnemonic);
                          setShowMnemonic(true);
                        } else {
                          Alert.alert('Error', result.error || 'Failed to export wallet');
                        }
                      }
                    }
                  ]
                );
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="eye-outline" size={20} color="white" />
                  <Text style={styles.exportButtonText}>Reveal Recovery Phrase</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.mnemonicContainer}>
              {/* Mnemonic Display */}
              <View style={styles.mnemonicBox}>
                <Text style={styles.mnemonicText}>{mnemonic}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(mnemonic);
                    Alert.alert('Copied', 'Recovery phrase copied to clipboard');
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color="white" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hideButton}
                  onPress={() => {
                    setShowMnemonic(false);
                    setMnemonic('');
                  }}
                >
                  <Ionicons name="eye-off-outline" size={18} color="white" />
                  <Text style={styles.hideButtonText}>Hide</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  background: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIcon: {
    fontSize: 24,
    color: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Sansation-Regular',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sansation-Regular',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 10,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  mnemonicContainer: {
    gap: 15,
  },
  mnemonicBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mnemonicText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  hideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  hideButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
});
