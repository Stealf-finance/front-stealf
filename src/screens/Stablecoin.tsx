import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import CopyableField from '../components/CopyableField';
import QRCodePlaceholder from '../components/QRCodePlaceholder';

interface StablecoinScreenProps {
  onBack?: () => void;
}

export default function StablecoinScreen({ onBack }: StablecoinScreenProps) {
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('../../assets/font/Sansation/Sansation-Italic.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const depositInfo = {
    stablecoin: 'USDC',
    network: 'Solana',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    memo: 'KeroBank-User-12345',
  };

  const handleCopyAll = () => {
    Alert.alert('Copied!', 'All deposit information copied to clipboard');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stablecoin Deposit</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Asset Info */}
          <View style={styles.assetSection}>
            <Text style={styles.assetTitle}>USDC on Solana</Text>
            <Text style={styles.assetSubtitle}>
              Send USDC tokens to this address to add funds to your account
            </Text>
          </View>

          {/* QR Code */}
          <View style={styles.qrSection}>
            <QRCodePlaceholder
              data={depositInfo.walletAddress}
              size={200}
            />
          </View>

          {/* Deposit Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Deposit Information</Text>

            <View style={styles.detailsCard}>
              <CopyableField
                label="Wallet Address"
                value={depositInfo.walletAddress}
              />

              {depositInfo.memo && (
                <CopyableField
                  label="Memo (Optional)"
                  value={depositInfo.memo}
                />
              )}

              <TouchableOpacity style={styles.copyAllButton} onPress={handleCopyAll} activeOpacity={0.8}>
                <Text style={styles.copyAllText}>Copy All Information</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Important Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Important Notes</Text>
            <View style={styles.notesList}>
              <Text style={styles.noteItem}>
                • Only send USDC tokens on the Solana network to this address
              </Text>
              <Text style={styles.noteItem}>
                • Sending other tokens or using wrong network may result in permanent loss
              </Text>
              <Text style={styles.noteItem}>
                • Minimum deposit: $10 USDC
              </Text>
              <Text style={styles.noteItem}>
                • Deposits are typically confirmed within 1-2 minutes
              </Text>
              <Text style={styles.noteItem}>
                • Save this address for future deposits
              </Text>
            </View>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Transaction Status</Text>
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>
                Waiting for deposit... We'll notify you when funds arrive.
              </Text>
              <TouchableOpacity style={styles.refreshButton} activeOpacity={0.8}>
                <Text style={styles.refreshText}>Check Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  assetSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  assetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  assetSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Sansation-Regular',
    paddingHorizontal: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  detailsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  copyAllButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  copyAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  notesSection: {
    marginBottom: 40,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 16,
  },
  notesList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 149, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noteItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'Sansation-Regular',
  },
  statusSection: {
    paddingBottom: 40,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Sansation-Regular',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
  },
});