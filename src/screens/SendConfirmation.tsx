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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { authStorage } from '../services/authStorage';
import { API_URL } from '../config/config';

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
    { id: 'privacy_1', name: 'Privacy 1' },
    { id: 'privacy_2', name: 'Privacy 2' },
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
    // Validation for external address
    if (destinationType === 'external' && !externalAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        setIsLoading(false);
        return;
      }

      let response;
      if (destinationType === 'privacy') {
        // Transfer to privacy wallet
        response = await fetch(`${API_URL}/api/v1/transaction/private`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
          }),
        });
      } else {
        // Transfer to external wallet
        response = await fetch(`${API_URL}/api/v1/transaction/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            toAddress: externalAddress,
            amount: parseFloat(amount),
          }),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setTransactionSignature(data.data?.signature || data.signature || 'COMPLETED');
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
      } else {
        Alert.alert('Transfer Failed', data.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      Alert.alert('Error', error.message || 'Failed to transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const solPrice = 100; // TODO: Get real SOL price

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
          <Text style={styles.headerTitle}>Confirm</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
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
                  <View style={styles.signatureContainer}>
                    <Text style={styles.signatureLabel}>Signature:</Text>
                    <Text style={styles.signatureText}>
                      {transactionSignature.substring(0, 20)}...
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.viewExplorerButton}
                  onPress={closeSuccessModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewExplorerText}>Close</Text>
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
    paddingHorizontal: 32,
    paddingTop: 60,
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
