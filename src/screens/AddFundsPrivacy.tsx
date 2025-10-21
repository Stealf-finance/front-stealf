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
  const [isRevealed, setIsRevealed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const handleReveal = () => {
    setShowWarning(true);
  };

  const handleConfirmReveal = () => {
    setShowWarning(false);
    setIsRevealed(true);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      setIsRevealed(false);
    }, 10000);
  };

  const handleCancelReveal = () => {
    setShowWarning(false);
  };

  const handleCopy = async () => {
    if (walletAddress && isRevealed) {
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
        colors={['#050008', '#0a0510', '#0f0a18']}
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
              {isRevealed ? (
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
              ) : (
                <TouchableOpacity
                  style={styles.qrCodeHidden}
                  onPress={handleReveal}
                  activeOpacity={0.8}
                >
                  <Image
                    source={require('../../assets/eyeoff.png')}
                    style={styles.eyeIconLarge}
                    resizeMode="contain"
                  />
                  <Text style={styles.revealText}>Tap to reveal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Wallet Address Section */}
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Wallet Address</Text>
            {isRevealed ? (
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
            ) : (
              <TouchableOpacity
                style={styles.addressButtonHidden}
                onPress={handleReveal}
                activeOpacity={0.8}
              >
                <Text style={styles.addressHiddenText}>••••••••••••••••</Text>
                <Image
                  source={require('../../assets/eyeoff.png')}
                  style={styles.eyeIconSmall}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
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

        {/* Warning Modal */}
        {showWarning && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image
                source={require('../../assets/infos.png')}
                style={styles.warningIcon}
                resizeMode="contain"
              />
              <Text style={styles.modalTitle}>Privacy Warning</Text>
              <Text style={styles.modalText}>
                Warning: Sharing this address with anyone may compromise your privacy. Only reveal if you understand the risks.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelReveal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmReveal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>I Understand</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
  qrCodeHidden: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  eyeIconLarge: {
    width: 40,
    height: 40,
    tintColor: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },
  revealText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  addressButtonHidden: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  addressHiddenText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    flex: 1,
    letterSpacing: 2,
  },
  eyeIconSmall: {
    width: 24,
    height: 24,
    tintColor: 'rgba(255, 255, 255, 0.6)',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 20, 45, 0.98)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  warningIcon: {
    width: 56,
    height: 56,
    tintColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
});