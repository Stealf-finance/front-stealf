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
import { useAuth } from '../../contexts/AuthContext';
import { useSendTransaction } from '../../hooks/useSendSimpleTransaction';
import { useAuthenticatedApi } from '../../services/clientStealf';
import { createGetSolPriceUSD } from '../../services/fetchWalletInfos';
import { usePrivacyCashTransfer } from '../../hooks/usePrivacyCashTransfer';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePrivacyBalance } from '../../hooks/usePrivacyBalance';
import { useStealthTransfer } from '../../hooks/useStealthTransfer';
import { useStealthAddress } from '../../hooks/useStealthAddress';

interface SendConfirmationProps {
  amount: string;
  onBack: () => void;
  onClose?: () => void;
  onSuccess: () => void;
  transferType?: 'basic' | 'private';
}

export default function SendConfirmation({ amount, onBack, onClose, onSuccess, transferType = 'private' }: SendConfirmationProps) {
  const { userData } = useAuth();
  const { session } = useTurnkey();
  const { sendTransaction, loading: simpleLoading } = useSendTransaction();
  const { initiatePrivateWithdraw, loading: privateLoading } = usePrivacyCashTransfer();
  const api = useAuthenticatedApi();

  const [externalAddress, setExternalAddress] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  // Stealth mode — activé automatiquement pour les transferts "basic" (wealth → stealth)
  const [stealthMode, setStealthMode] = useState(transferType === 'basic');
  const [metaAddress, setMetaAddress] = useState('');
  const [metaAddressError, setMetaAddressError] = useState<string | null>(null);
  const { send: sendStealth, isLoading: stealthLoading } = useStealthTransfer();
  const { metaAddress: ownMetaAddress } = useStealthAddress();

  // Pré-remplir avec la meta-adresse propre quand mode stealth par défaut (basic)
  React.useEffect(() => {
    if (transferType === 'basic' && ownMetaAddress && !metaAddress) {
      setMetaAddress(ownMetaAddress);
    }
  }, [ownMetaAddress]);

  const validateMetaAddress = (value: string) => {
    try {
      const bs58 = require('bs58');
      const decoded = bs58.decode(value);
      if (decoded.length !== 64) {
        setMetaAddressError('Format invalide (64 bytes attendu)');
      } else {
        setMetaAddressError(null);
      }
    } catch {
      setMetaAddressError('Format base58 invalide');
    }
  };

  const successAnimation = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const handleConfirm = async () => {
    // Stealth mode : utiliser useStealthTransfer
    if (stealthMode) {
      if (!metaAddress || metaAddressError) {
        Alert.alert('Error', 'Please enter a valid stealth meta-address');
        return;
      }
      if (!userData?.stealf_wallet) {
        Alert.alert('Error', 'No privacy wallet found');
        return;
      }
      const amountSOL = parseFloat(amount);
      const amountLamports = BigInt(Math.round(amountSOL * 1_000_000_000));
      const sig = await sendStealth(metaAddress, amountLamports, userData.stealf_wallet);
      if (sig) {
        setTransactionSignature(sig);
        setShowSuccessModal(true);
        Animated.sequence([
          Animated.timing(successAnimation, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(checkmarkScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        ]).start();
      }
      return;
    }

    if (!externalAddress) {
      Alert.alert('Error', 'Please enter a destination address');
      return;
    }

    if (!userData?.stealf_wallet) {
      Alert.alert('Error', 'No privacy wallet found');
      return;
    }

    try {
      if (!externalAddress) {
        throw new Error('Invalid destination address');
      }

      const amountSOL = parseFloat(amount);
      let signature: string;

      if (transferType === 'private') {
        if (!session?.token) {
          Alert.alert('Error', 'No session token found');
          return;
        }

        const transfer = await initiatePrivateWithdraw(
          userData.cash_wallet,
          externalAddress,
          amountSOL,
          session.token
        );

        signature = transfer.transactions?.privacyCashWithdrawTx || 'Processing...';
      } else {
        signature = await sendTransaction(
          userData.stealf_wallet,
          externalAddress,
          amountSOL
        );
      }

      setTransactionSignature(signature);
      setShowSuccessModal(true);

      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (err: any) {
      console.error('[SendPrivateConfirmation] Transfer error:', err);
      Alert.alert(
        'Transfer Failed',
        err.message || 'An error occurred while sending the transaction'
      );
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    successAnimation.setValue(0);
    checkmarkScale.setValue(0);
    setTransactionSignature(null);
    onSuccess();
  };

  const isLoading = stealthMode ? stealthLoading : (transferType === 'private' ? privateLoading : simpleLoading);

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
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
          <TouchableOpacity style={styles.closeButton} onPress={onClose || onBack} activeOpacity={0.8}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
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
            <Text style={styles.value}>{amount} SOL</Text>
          </View>

          {/* Network */}
          <View style={styles.section}>
            <Text style={styles.label}>Network</Text>
            <Text style={styles.value}>Solana</Text>
          </View>

          {/* To */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.label}>To</Text>
              {/* Stealth mode toggle */}
              <TouchableOpacity
                onPress={() => { setStealthMode(!stealthMode); setMetaAddressError(null); }}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: stealthMode ? '#8B5CF6' : 'rgba(255,255,255,0.2)', backgroundColor: stealthMode ? 'rgba(139,92,246,0.15)' : 'transparent' }}
                activeOpacity={0.7}
              >
                <Text style={{ color: stealthMode ? '#8B5CF6' : 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Sansation-Regular' }}>
                  {stealthMode ? '🔒 Stealth' : 'Stealth'}
                </Text>
              </TouchableOpacity>
            </View>

            {stealthMode ? (
              <>
                {/* Meta-address Input */}
                <View style={styles.addressInputContainer}>
                  <TextInput
                    style={[styles.addressInput, metaAddressError ? { borderColor: '#EF4444' } : {}]}
                    placeholder="Meta-adresse du destinataire (base58)..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={metaAddress}
                    onChangeText={(v) => { setMetaAddress(v); if (v.length > 40) validateMetaAddress(v); else setMetaAddressError(null); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                  />
                </View>
                {metaAddressError && (
                  <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontFamily: 'Sansation-Regular' }}>
                    {metaAddressError}
                  </Text>
                )}
              </>
            ) : (
              /* Address Input */
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
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
