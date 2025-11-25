import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFonts } from 'expo-font';
import AppBackground from '../../components/common/AppBackground';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../../hooks/useWallet';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { AddFundsScreenProps } from '../../types';

export default function AddFundsScreen({ onBack }: AddFundsScreenProps) {
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('../../assets/font/Sansation/Sansation-Italic.ttf'),
  });

  const { walletAddress } = useWallet();
  const [copied, setCopied] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const handleFaucet = async () => {
    if (!walletAddress) return;

    setFaucetLoading(true);
    try {
      console.log('🚰 Requesting airdrop for:', walletAddress);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const publicKey = new PublicKey(walletAddress);

      // Demander 2 SOL (max autorisé par requête sur devnet)
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);

      console.log('📝 Airdrop signature:', signature);

      // Attendre la confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Airdrop confirmed!');
      Alert.alert('Success', '2 SOL received on your wallet!');
    } catch (error: any) {
      console.error('Failed to request airdrop:', error);

      // Gérer les erreurs communes
      let errorMessage = 'Failed to get SOL';
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        errorMessage = 'Rate limit reached. Try again in a few minutes.';
      } else if (error.message?.includes('airdrop')) {
        errorMessage = 'Airdrop limit reached. Try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleCopy = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrCode = useMemo(() => {
    if (!walletAddress) return null;
    return (
      <QRCode
        value={walletAddress}
        size={200}
        color="white"
        backgroundColor="#000000"
        ecl="L"
      />
    );
  }, [walletAddress]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AppBackground>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Funds</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Scan QR Code</Text>
            <View style={styles.qrContainer}>
              {qrCode || (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>Loading...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Wallet Address Section */}
          <View style={styles.addressSection}>
            <Text style={styles.infoText}>
              SOL & USDC - Solana Network
            </Text>
            <TouchableOpacity
              style={styles.addressButton}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text style={styles.addressButtonText} numberOfLines={1} ellipsizeMode="middle">
                {copied ? 'Copied!' : (walletAddress || 'Loading...')}
              </Text>
              <Image
                source={require('../../assets/copiercoller.png')}
                style={styles.copyIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Faucet Section (Devnet) */}
          <View style={styles.faucetSection}>
            <Text style={styles.faucetTitle}>Need test SOL?</Text>
            <Text style={styles.faucetSubtitle}>
              Get free devnet SOL for testing
            </Text>
            <TouchableOpacity
              style={styles.faucetButton}
              onPress={handleFaucet}
              activeOpacity={0.8}
              disabled={faucetLoading || !walletAddress}
            >
              {faucetLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Text style={styles.faucetButtonText}>Get Devnet SOL</Text>
                  <Text style={styles.faucetButtonIcon}>💧</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </AppBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'normal',
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  qrTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  addressSection: {
    marginBottom: 40,
    paddingHorizontal: 0,
  },
  addressButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  addressButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    flex: 1,
    marginRight: 12,
  },
  copyIcon: {
    width: 24,
    height: 24,
    tintColor: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 12,
  },
  faucetSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  faucetTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  faucetSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginBottom: 20,
  },
  faucetButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  faucetButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
  },
  faucetButtonIcon: {
    fontSize: 18,
  },
});