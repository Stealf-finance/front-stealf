import { useState, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from '../services/authStorage';
import { getGridClient } from '../config/grid';

export const useSendTransaction = (onSuccess: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [destinationType, setDestinationType] = useState<'privacy' | 'external'>('privacy');
  const [externalAddress, setExternalAddress] = useState('');
  const [selectedPrivacyWallet, setSelectedPrivacyWallet] = useState('privacy_1');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const successAnimation = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const gridClient = getGridClient();

  const privateWallets = [
    { id: 'privacy_1', name: 'Privacy 1' },
    { id: 'privacy_2', name: 'Privacy 2' },
  ];

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

  const handleConfirm = async (amount: string) => {
    if (destinationType === 'external' && !externalAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Starting transaction with Grid SDK...');

      const userWalletAddress = await authStorage.getGridAddress();
      console.log('💳 User wallet address:', userWalletAddress);

      if (!userWalletAddress) {
        console.log('❌ No wallet address found');
        Alert.alert('Error', 'User wallet address not found');
        setIsLoading(false);
        return;
      }

      const userData = await authStorage.getUserData();
      const gridUserId = userData?.grid_user_id || userData?.grid_address;
      console.log('👤 Grid user ID:', gridUserId);

      if (!gridUserId) {
        console.log('❌ No grid user ID found');
        Alert.alert('Error', 'User ID not found');
        setIsLoading(false);
        return;
      }

      const sessionSecretsStr = await SecureStore.getItemAsync('session_secrets');
      if (!sessionSecretsStr) {
        throw new Error('Session secrets not found. Please log in again.');
      }
      const sessionSecrets = JSON.parse(sessionSecretsStr);

      const authentication = userData?.authentication;
      if (!authentication) {
        throw new Error('Authentication data not found. Please log in again.');
      }

      console.log('💸 Creating payment with Grid SDK...');
      const recipientAddress = destinationType === 'privacy' ? selectedPrivacyWallet : externalAddress;

      const paymentPayload = {
        amount: (parseFloat(amount) * 1_000_000).toString(),
        source: {
          account: userWalletAddress,
          currency: 'usdc'
        },
        destination: {
          address: recipientAddress,
          currency: 'usdc'
        }
      };

      const paymentIntentResponse = await gridClient.createPaymentIntent(userWalletAddress, paymentPayload);

      console.log('✅ Payment intent created');

      if (!paymentIntentResponse.data?.transactionPayload) {
        throw new Error('No transaction payload received');
      }

      console.log('✍️ Signing transaction...');
      const signedPayload = await gridClient.sign({
        sessionSecrets: sessionSecrets,
        session: authentication,
        transactionPayload: paymentIntentResponse.data.transactionPayload
      });

      console.log('✅ Transaction signed');

      console.log('🚀 Sending transaction...');
      const result = await gridClient.send({
        address: userWalletAddress,
        signedTransactionPayload: signedPayload,
      });

      console.log('✅ Transaction sent successfully!', result);

      setTransactionSignature(result.transaction_signature || 'COMPLETED');
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

  return {
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
  };
};
