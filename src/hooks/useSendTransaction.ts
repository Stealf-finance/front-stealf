import { useState, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { authStorage } from '../services/authStorage';
import solanaWalletService from '../services/solanaWalletService';
import { umbraApi, isError } from '../services/umbraApiClient';
import { arciumApi, isArciumError } from '../services/arciumApiClient';
import stealfService from '../services/stealfService';
import bs58 from 'bs58';
import type {
  DepositResponse,
  UmbraApiError,
  MixerTransferResponse
} from '../types/umbra';
import type {
  PrivacyPoolTransferResponse,
  ArciumApiError
} from '../services/arciumApiClient';

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
      console.log('🚀 Starting transaction with Solana Wallet...');

      // Load the Solana wallet
      const solanaKeypair = await solanaWalletService.loadWallet();
      if (!solanaKeypair) {
        console.log('❌ No Solana wallet found');
        Alert.alert('Error', 'Solana wallet not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const userWalletAddress = solanaKeypair.publicKey.toBase58();
      console.log('💳 Solana wallet address:', userWalletAddress);

      console.log('💸 Creating SOL transfer...');

      // Convert USD amount to SOL (using fictive price: $140 per SOL)
      const SOL_PRICE_USD = 140;
      const amountInSOL = parseFloat(amount) / SOL_PRICE_USD;
      const amountInLamports = Math.floor(amountInSOL * 1_000_000_000);

      console.log(`💰 Converting $${amount} USD to ${amountInSOL.toFixed(4)} SOL (${amountInLamports} lamports)`);

      // PRIVATE TRANSFER: Solana Wallet → Privacy Pool → Private Wallet
      if (destinationType === 'privacy') {
        console.log('🔒 Starting PRIVATE transfer via Privacy Pool...');
        console.log(`💸 Amount: ~${amountInSOL.toFixed(4)} SOL`);

        // Get the private wallet's keypair
        console.log('🔑 Retrieving private wallet...');
        const privateWalletKeypair = await stealfService.getPrivateWalletKeypair();

        if (!privateWalletKeypair) {
          console.error('❌ No private wallet found');
          throw new Error('Private wallet not found. Please set up your private wallet first.');
        }

        const privateWalletAddress = privateWalletKeypair.publicKey.toBase58();
        console.log(`📥 Private Wallet: ${privateWalletAddress}`);

        // Get Solana wallet secret key for signing
        const solanaSecretKey = await solanaWalletService.getSecretKey();
        if (!solanaSecretKey) {
          throw new Error('Failed to retrieve Solana wallet secret key');
        }
        const solanaPrivateKeyBase58 = bs58.encode(solanaSecretKey);

        // PRIVACY POOL TRANSFER: Breaks on-chain link between sender and recipient
        console.log('');
        console.log('🔒 Creating PRIVATE transfer via Privacy Pool...');
        console.log(`   From: ${userWalletAddress.slice(0, 8)}...`);
        console.log(`   To:   ${privateWalletAddress.slice(0, 8)}...`);
        console.log(`   Amount: ${amountInSOL.toFixed(4)} SOL`);

        // Call Privacy Pool API to create private transfer
        const poolResult = await arciumApi.encryptedTransfer({
          fromPrivateKey: solanaPrivateKeyBase58,
          toAddress: privateWalletAddress,
          amount: amountInSOL,
          userId: userWalletAddress, // Use wallet address as user ID
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
        console.log('');
        console.log('🔒 PRIVACY GUARANTEED:');
        console.log(`   ✅ No direct on-chain link between sender and recipient`);
        console.log(`   ✅ Sender → Pool (visible)`);
        console.log(`   ✅ Pool → Recipient (visible)`);
        console.log(`   ✅ Link broken!`);

        // Store withdraw transaction signature for display (recipient's incoming tx)
        setTransactionSignature(result.transactions.withdraw.signature);
        setShowSuccessModal(true);

        // Animate success modal
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

        setIsLoading(false);
        return;
      }

      // EXTERNAL TRANSFER: Use Solana Wallet directly
      const recipientAddress = externalAddress;
      console.log('📤 Sending to external address:', recipientAddress);

      console.log('✍️ Sending transaction...');
      const signature = await solanaWalletService.sendSOL(recipientAddress, amountInSOL);

      console.log('✅ Transaction sent successfully!', signature);

      setTransactionSignature(signature);
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
