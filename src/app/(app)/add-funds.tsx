import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useRouter } from 'expo-router';
import ComebackIcon from '../../assets/buttons/comeback.svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../contexts/AuthContext';

export default function AddFundsScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const walletAddress = userData?.cash_wallet;
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);

  const handleAirdrop = async () => {
    if (!walletAddress) return;
    setAirdropping(true);
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const { PublicKey } = await import('@solana/web3.js');
      const sig = await connection.requestAirdrop(new PublicKey(walletAddress), 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      Alert.alert('Airdrop', '2 SOL received!');
    } catch (err: any) {
      Alert.alert('Airdrop Failed, try again later');
    } finally {
      setAirdropping(false);
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <ComebackIcon width={18} height={18} />
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
              USDC only - Solana Network
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
                source={require('../../assets/buttons/copier-coller.svg')}
                style={styles.copyIcon}
                contentFit="contain"
                transition={200}
              />
            </TouchableOpacity>
          </View>

          {/* Devnet Airdrop */}
            <TouchableOpacity
              style={[styles.airdropButton, airdropping && styles.airdropButtonDisabled]}
              onPress={handleAirdrop}
              disabled={airdropping}
              activeOpacity={0.8}
            >
              {airdropping ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.airdropButtonText}>Airdrop 2 SOL (Devnet)</Text>
              )}
            </TouchableOpacity>
          
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
  airdropButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  airdropButtonDisabled: {
    opacity: 0.5,
  },
  airdropButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
});