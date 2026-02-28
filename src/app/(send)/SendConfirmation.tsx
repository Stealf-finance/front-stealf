import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useSendTransaction } from '../../hooks/useSendSimpleTransaction';
import { useStealthTransfer } from '../../hooks/useStealthTransfer';
import { useAuth } from '../../contexts/AuthContext';

interface TokenInfo {
  symbol: string;
  mint: string | null;
  decimals: number;
}

interface SendConfirmationProps {
  amount: string;
  token: TokenInfo;
  onBack: () => void;
  onClose?: () => void;
  onSuccess: () => void;
}

const isSOL = (token: TokenInfo) => !token.mint;

function isMetaAddress(addr: string): boolean {
  try {
    const bs58 = require('bs58');
    const decoded = bs58.decode(addr);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

export default function SendConfirmation({ amount, token, onBack, onClose, onSuccess }: SendConfirmationProps) {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const { sendTransaction, loading: loadingDirect } = useSendTransaction();
  const { send: sendStealth, isLoading: loadingStealth } = useStealthTransfer();

  const [address, setAddress] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const successAnimation = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const isLoading = loadingDirect || loadingStealth;

  // Stealth si SOL + meta-address 64 bytes, sinon direct
  const usesStealth = isSOL(token) && isMetaAddress(address.trim());
  const isPrivate = usesStealth;

  const handleConfirm = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a destination address');
      return;
    }

    if (!userData?.cash_wallet) {
      Alert.alert('Error', 'No wallet found');
      return;
    }

    try {
      let signature: string;

      if (usesStealth) {
        // SOL + meta-address → stealth transfer (privé)
        const amountLamports = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));
        const result = await sendStealth(address.trim(), amountLamports, userData.cash_wallet);
        if (!result) {
          Alert.alert('Error', 'Stealth transfer failed. Check the meta-address and your balance.');
          return;
        }
        signature = result.txSignature;
        setPointsEarned(result.pointsEarned || 15);
        queryClient.invalidateQueries({ queryKey: ['points'] });
      } else {
        // SOL adresse normale ou USDC → transfert direct
        signature = await sendTransaction(
          userData.cash_wallet,
          address.trim(),
          parseFloat(amount),
          token.mint,
          token.decimals,
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
      if (!err.isGuard) __DEV__ && console.error('Transaction error:', err);
      Alert.alert(
        err.isGuard ? 'Validation Error' : 'Transaction Failed',
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

            {/* Privacy Badge */}
            <View style={[styles.privacyBadge, isPrivate ? styles.privacyBadgePrivate : styles.privacyBadgePublic]}>
              <Text style={[styles.privacyBadgeText, isPrivate ? styles.privacyBadgeTextPrivate : styles.privacyBadgeTextPublic]}>
                {isPrivate ? '⬥  Private transfer' : '⬥  Public transfer'}
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.value}>{amount} {token.symbol}</Text>
            </View>

            {/* Network */}
            <View style={styles.section}>
              <Text style={styles.label}>Network</Text>
              <Text style={styles.value}>Solana</Text>
            </View>

            {/* To */}
            <View style={styles.section}>
              <Text style={styles.label}>To</Text>
              {isSOL(token) && (
                <Text style={styles.hint}>Solana address or Stealf meta-address (64 bytes = private)</Text>
              )}
              <View style={styles.addressInputContainer}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Paste address..."
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
              </View>
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
                    { transform: [{ scale: checkmarkScale }] },
                  ]}
                >
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>

                <Text style={styles.successTitle}>Transaction Sent</Text>
                {pointsEarned > 0 && (
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>+{pointsEarned} pts ✦</Text>
                  </View>
                )}
                <Text style={styles.successMessage}>
                  {isPrivate
                    ? 'SOL sent privately. The recipient can claim it with their Stealf app.'
                    : 'Your transaction has been successfully sent.'}
                </Text>

                {transactionSignature && (
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
                  style={[styles.closeModalButton]}
                  onPress={closeSuccessModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeModalText}>Close</Text>
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
    paddingTop: 24,
    paddingBottom: 20,
  },
  privacyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 32,
  },
  privacyBadgePrivate: {
    backgroundColor: 'rgba(0, 200, 120, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 120, 0.4)',
  },
  privacyBadgePublic: {
    backgroundColor: 'rgba(255, 160, 50, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 160, 50, 0.4)',
  },
  privacyBadgeText: {
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
  },
  privacyBadgeTextPrivate: {
    color: '#00c878',
  },
  privacyBadgeTextPublic: {
    color: '#ffa032',
  },
  section: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    fontFamily: 'Sansation-Regular',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 10,
    fontFamily: 'Sansation-Regular',
  },
  value: {
    fontSize: 32,
    color: 'white',
    fontWeight: '400',
    fontFamily: 'Sansation-Light',
  },
  addressInputContainer: {
    marginTop: 8,
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
    minHeight: 56,
  },
  buttonContainer: {
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
  closeModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeModalText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  pointsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 14,
  },
  pointsBadgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    fontWeight: '700',
  },
});
