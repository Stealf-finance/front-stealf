import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { authStorage } from '../../services/authStorage';
import solanaWalletService from '../../services/solanaWalletService';
import stealfService from '../../services/stealfService';
import { arciumApi, isArciumError } from '../../services/arciumApiClient';
import bs58 from 'bs58';
import type { PrivacyPoolTransferResponse, ArciumApiError } from '../../services/arciumApiClient';

interface SendConfirmationProps {
  amount: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function SendConfirmation({ amount, onBack, onSuccess }: SendConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [destinationType, setDestinationType] = useState<'privacy' | 'external'>('privacy');
  const [externalAddress, setExternalAddress] = useState('');
  const [selectedPrivacyWallet, setSelectedPrivacyWallet] = useState('privacy_1');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const successAnimation = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  // Liste des wallets privés (à remplacer par des vraies données plus tard)
  const privateWallets = [
    { id: 'privacy_1', name: 'MAIN' },
  ];

  // Load fonts
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const closeSuccessModal = () => {
    Animated.timing(successAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccessModal(false);
      checkmarkScale.setValue(0);
      onSuccess();
    });
  };

  const handleConfirm = async () => {
    if (destinationType === 'external' && !externalAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔒 Starting PRIVATE transfer from Privacy Wallet...');

      // Get the private wallet's keypair (sender)
      const privateWalletKeypair = await stealfService.getPrivateWalletKeypair();
      if (!privateWalletKeypair) {
        throw new Error('Private wallet not found');
      }

      const privateWalletAddress = privateWalletKeypair.publicKey.toBase58();
      const privateKeyBase58 = bs58.encode(privateWalletKeypair.secretKey);
      console.log(`📤 From Private Wallet: ${privateWalletAddress.slice(0, 8)}...`);

      // Determine recipient address
      let recipientAddress: string;
      if (destinationType === 'privacy') {
        // Send to public wallet
        const solanaKeypair = await solanaWalletService.loadWallet();
        if (!solanaKeypair) {
          throw new Error('Public wallet not found');
        }
        recipientAddress = solanaKeypair.publicKey.toBase58();
        console.log(`📥 To Public Wallet: ${recipientAddress.slice(0, 8)}...`);
      } else {
        // Send to external address
        recipientAddress = externalAddress.trim();
        console.log(`📥 To External Address: ${recipientAddress.slice(0, 8)}...`);
      }

      // Convert USD to SOL
      const SOL_PRICE_USD = 140;
      const amountInSOL = parseFloat(amount) / SOL_PRICE_USD;
      console.log(`💰 Amount: ${amountInSOL.toFixed(4)} SOL`);

      // Execute private transfer via Privacy Pool
      console.log('🔒 Creating PRIVATE transfer via Privacy Pool...');
      const poolResult = await arciumApi.encryptedTransfer({
        fromPrivateKey: privateKeyBase58,
        toAddress: recipientAddress,
        amount: amountInSOL,
      });

      if (isArciumError(poolResult)) {
        const error = poolResult as ArciumApiError;
        console.error('❌ Privacy pool transfer failed:', error.message);
        throw new Error(`Private transfer failed: ${error.message}`);
      }

      const result = poolResult as PrivacyPoolTransferResponse;
      console.log('✅ PRIVATE TRANSFER COMPLETE!');
      console.log(`   Deposit TX: ${result.transactions.deposit.signature}`);
      console.log(`   Withdraw TX: ${result.transactions.withdraw.signature}`);
      console.log('🔒 No direct on-chain link between sender and recipient!');

      // Show success
      setTransactionSignature(result.transactions.withdraw.signature);
      setShowSuccessModal(true);

      Animated.parallel([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (error: any) {
      console.error('❌ Transfer error:', error);
      Alert.alert('Error', error.message || 'Failed to transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const solPrice = 100; // TODO: Get real SOL price

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
          <Text style={styles.headerTitle}>Confirm</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content with KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>{amount} USD</Text>
          </View>

          {/* Network */}
          <View style={styles.section}>
            <Text style={styles.label}>Network</Text>
            <Text style={styles.value}>Solana</Text>
          </View>

          {/* To */}
          <View style={styles.section}>
            <Text style={styles.label}>To</Text>

            {/* Destination Type Selector */}
            <View style={styles.destinationToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  destinationType === 'privacy' && styles.toggleOptionActive
                ]}
                onPress={() => setDestinationType('privacy')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.toggleText,
                  destinationType === 'privacy' && styles.toggleTextActive
                ]}>
                  My Public Wallet
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  destinationType === 'external' && styles.toggleOptionActive
                ]}
                onPress={() => setDestinationType('external')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.toggleText,
                  destinationType === 'external' && styles.toggleTextActive
                ]}>
                  Other Wallet
                </Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Wallet Dropdown */}
            {destinationType === 'privacy' && (
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownButtonText}>
                    {privateWallets.find(w => w.id === selectedPrivacyWallet)?.name || 'Select Wallet'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {showPrivacyDropdown && (
                  <View style={styles.dropdownList}>
                    {privateWallets.map((wallet) => (
                      <TouchableOpacity
                        key={wallet.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedPrivacyWallet(wallet.id);
                          setShowPrivacyDropdown(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedPrivacyWallet === wallet.id && styles.dropdownItemTextActive
                        ]}>
                          {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* External Address Input */}
            {destinationType === 'external' && (
              <View style={styles.addressInputContainer}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Paste wallet address..."
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={externalAddress}
                  onChangeText={setExternalAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </View>

          {/* Confirm Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Success Modal */}
        <Modal
          transparent={true}
          visible={showSuccessModal}
          animationType="none"
          onRequestClose={closeSuccessModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeSuccessModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    opacity: successAnimation,
                    transform: [
                      {
                        scale: successAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.checkmarkCircle,
                    {
                      transform: [{ scale: checkmarkScale }],
                    },
                  ]}
                >
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>

                <Text style={styles.successTitle}>Transaction Sent</Text>
                <Text style={styles.successMessage}>
                  Your transaction has been successfully sent
                </Text>

                {transactionSignature && transactionSignature !== 'COMPLETED' && (
                  <TouchableOpacity
                    style={styles.signatureContainer}
                    onPress={async () => {
                      await Clipboard.setStringAsync(transactionSignature);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signatureLabel}>Signature (tap to copy):</Text>
                    <Text style={styles.signatureText}>
                      {transactionSignature.substring(0, 20)}...
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.viewExplorerButton}
                  onPress={() => {
                    Linking.openURL(`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewExplorerText}>View on Explorer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewExplorerButton, { marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.3)' }]}
                  onPress={closeSuccessModal}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.viewExplorerText, { color: 'white' }]}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 48,
  },
  label: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  value: {
    fontSize: 32,
    color: 'white',
    fontWeight: '400',
    fontFamily: 'Sansation-Light',
  },
  destinationToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  toggleTextActive: {
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  dropdownContainer: {
    marginTop: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dropdownButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
  dropdownArrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontFamily: 'Sansation-Regular',
  },
  dropdownItemTextActive: {
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  addressInputContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addressInput: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  confirmButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 100, 0.2)',
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(100, 255, 100, 0.2)',
    borderWidth: 3,
    borderColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: '#00ff88',
    fontSize: 40,
    fontWeight: 'bold',
  },
  successTitle: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Sansation-Bold',
  },
  successMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Sansation-Regular',
  },
  signatureContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  signatureLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Sansation-Regular',
  },
  signatureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  viewExplorerButton: {
    backgroundColor: 'rgba(100, 255, 100, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  viewExplorerText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
});
