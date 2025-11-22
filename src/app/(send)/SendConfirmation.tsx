import React from 'react';
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
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFonts } from 'expo-font';
import AppBackground from '../../components/common/AppBackground';
import { useSendTransaction } from '../../hooks/useSendTransaction';

interface SendConfirmationProps {
  amount: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function SendConfirmation({ amount, onBack, onSuccess }: SendConfirmationProps) {
  const {
    isLoading,
    showSuccessModal,
    transactionSignature,
    destinationType,
    setDestinationType,
    externalAddress,
    setExternalAddress,
    selectedPrivacyWallet,
    setSelectedPrivacyWallet,
    showPrivacyDropdown,
    setShowPrivacyDropdown,
    successAnimation,
    checkmarkScale,
    privateWallets,
    handleConfirm,
    closeSuccessModal,
  } = useSendTransaction(onSuccess);

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
      <AppBackground>

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
                  My Privacy Wallet
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

            {/* Privacy Wallet Info */}
            {destinationType === 'privacy' && (
              <View style={styles.privacyInfoContainer}>
                <Text style={styles.privacyInfoTitle}>🔒 Umbra Privacy Transfer</Text>
                <Text style={styles.privacyInfoText}>
                  Your funds will be anonymously deposited into the Umbra mixer pool.
                </Text>
                <Text style={styles.privacyInfoDetails}>
                  • Transaction is anonymous{'\n'}
                  • Amount visible on-chain{'\n'}
                  • Estimated time: 30-60 seconds{'\n'}
                  • Can be claimed later from Privacy Balance
                </Text>
              </View>
            )}

            {/* Privacy Wallet Dropdown - Commented for now (single wallet) */}
            {false && destinationType === 'privacy' && (
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
              onPress={() => handleConfirm(amount)}
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
  privacyInfoContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
    padding: 16,
  },
  privacyInfoTitle: {
    color: '#B19CD9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Sansation-Bold',
  },
  privacyInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
    lineHeight: 20,
  },
  privacyInfoDetails: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    lineHeight: 18,
  },
});
