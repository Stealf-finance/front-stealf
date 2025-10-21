import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Animated,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../hooks/useWallet';
import type { AddFundsScreenProps } from '../types';

export default function AddFundsScreen({ onBack }: AddFundsScreenProps) {
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('../../assets/font/Sansation/Sansation-Italic.ttf'),
  });

  const { walletAddress } = useWallet();
  const [copied, setCopied] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const handleCopy = async () => {
    if (walletAddress) {
      await Clipboard.setString(walletAddress);
      setCopied(true);

      // Animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setCopied(false));
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Funds</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>Scan QR Code</Text>
            <View style={styles.qrContainer}>
              <View style={styles.qrCodePlaceholder}>
                {walletAddress ? (
                  <QRCode
                    value={walletAddress}
                    size={180}
                    backgroundColor="white"
                    color="black"
                  />
                ) : (
                  <>
                    <Text style={styles.qrPlaceholderText}>QR CODE</Text>
                    <Text style={styles.qrSubtext}>Loading...</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Wallet Address Section */}
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Wallet Address</Text>
            <TouchableOpacity
              style={[styles.addressButton, copied && styles.addressButtonCopied]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text style={styles.addressButtonText} numberOfLines={1} ellipsizeMode="middle">
                {copied ? 'Copied' : (walletAddress || 'Loading...')}
              </Text>
              {copied && (
                <Animated.View style={[styles.checkmarkContainer, { opacity: fadeAnim }]}>
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>
              )}
              {!copied && (
                <Image
                  source={require('../../assets/copiercoller.png')}
                  style={styles.copyIcon}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>How to add funds</Text>
            <Text style={styles.infoText}>
              • Send SOL or USDC to this address{'\n'}
              • Use the QR code for easy scanning{'\n'}
              • Funds will appear in your balance once confirmed
            </Text>
          </View>
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
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  qrPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  qrSubtext: {
    fontSize: 12,
    color: '#666',
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
  addressButtonCopied: {
    backgroundColor: 'rgba(60, 60, 60, 0.95)',
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
  checkmarkContainer: {
    marginLeft: 8,
  },
  checkmark: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginBottom: 40,
  },
  infoTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
    fontFamily: 'Sansation-Regular',
  },
});