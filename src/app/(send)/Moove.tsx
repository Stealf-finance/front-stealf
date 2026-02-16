import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { usePrivacyBalance } from '../../hooks/usePrivacyBalance';
import { useWalletInfos } from '../../hooks/useWalletInfos';
import { useSwapApi } from '../../services/swapService';
import { useSendTransaction } from '../../hooks/useSendSimpleTransaction';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';

import ArrowIcon from '../../assets/buttons/arrow.svg';
import ComebackIcon from '../../assets/buttons/comeback.svg';

const SECURE_STORE_KEY = 'stealf_private_key';
const MNEMONIC_STORE_KEY = 'stealf_wallet_mnemonic';
const HARDENED_OFFSET = 0x80000000;

function derivePath(path: string, seed: Uint8Array): { key: Uint8Array } {
  const I = hmac(sha512, 'ed25519 seed', seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);
  const segments = path.split('/').slice(1);
  for (const segment of segments) {
    const isHardened = segment.endsWith("'");
    const index = parseInt(isHardened ? segment.slice(0, -1) : segment, 10);
    const hardenedIndex = isHardened ? index + HARDENED_OFFSET : index;
    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, hardenedIndex, false);
    const child = hmac(sha512, chainCode, data);
    key = child.slice(0, 32);
    chainCode = child.slice(32);
  }
  return { key };
}

async function getPrivacyKeypair(): Promise<Keypair> {
  const storedKey = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (storedKey) {
    const secretKey = bs58.decode(storedKey);
    return Keypair.fromSecretKey(secretKey);
  }

  const storedMnemonic = await SecureStore.getItemAsync(MNEMONIC_STORE_KEY);
  if (storedMnemonic) {
    const seed = await bip39.mnemonicToSeed(storedMnemonic);
    const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));
    return Keypair.fromSeed(key);
  }

  throw new Error('No privacy wallet key found');
}

interface MooveScreenProps {
  onBack: () => void;
  direction?: 'toCash' | 'toPrivacy';
}

export default function MooveScreen({ onBack, direction = 'toCash' }: MooveScreenProps) {
  const [amount, setAmount] = useState('');
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState('');
  const [successSymbol, setSuccessSymbol] = useState('');
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const { userData, isWalletAuth } = useAuth();
  const queryClient = useQueryClient();
  const { usdcBalance: cashUsdcBalance } = usePrivacyBalance();
  const { tokens: privacyTokens } = useWalletInfos(userData?.stealf_wallet || '');
  const { tokens: cashTokens } = useWalletInfos(userData?.cash_wallet || '');
  const { order, execute } = useSwapApi();
  const { sendTransaction: sendDirectTransfer } = useSendTransaction();

  const isToCash = direction === 'toCash';
  const sourceTokens = isToCash ? privacyTokens : cashTokens;
  const sourceLabel = isToCash ? 'Wealth' : 'Cash';
  const destLabel = isToCash ? 'Cash' : 'Wealth';
  const fromWallet = isToCash ? userData?.stealf_wallet : userData?.cash_wallet;
  const toWallet = isToCash ? userData?.cash_wallet : userData?.stealf_wallet;
  const selectedToken = sourceTokens[selectedTokenIndex] || null;

  useEffect(() => {
    if (selectedTokenIndex >= privacyTokens.length && privacyTokens.length > 0) {
      setSelectedTokenIndex(0);
    }
  }, [privacyTokens.length, selectedTokenIndex]);

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    const digits = amount.replace('.', '');
    if (num !== '.' && digits.length >= 8) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleMove = async () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedToken) {
      Alert.alert('Error', 'No token selected');
      return;
    }

    const amountNum = parseFloat(amount);

    if (amountNum > selectedToken.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (!fromWallet || !toWallet) {
      Alert.alert('Error', 'Wallets not found');
      return;
    }

    const isNativeSOL = !selectedToken.tokenMint || selectedToken.tokenMint === 'So11111111111111111111111111111111';

    setLoading(true);
    try {
      if (isWalletAuth) {
        // MWA users: direct transfer via useSendTransaction (signs via Seed Vault)
        const tokenMint = isNativeSOL ? undefined : selectedToken.tokenMint;
        await sendDirectTransfer(
          fromWallet,
          toWallet,
          amountNum,
          tokenMint,
          selectedToken.tokenDecimals,
        );
      } else {
        // Passkey users: use Jupiter swap via backend
        const inputMint = selectedToken.tokenMint || 'So11111111111111111111111111111111';
        const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, selectedToken.tokenDecimals)).toString();

        const orderResponse = await order({
          inputMint,
          amount: amountInSmallestUnit,
          taker: fromWallet,
          receiver: toWallet,
        });

        const keypair = await getPrivacyKeypair();
        const txBuffer = Buffer.from(orderResponse.transaction, 'base64');
        const transaction = VersionedTransaction.deserialize(new Uint8Array(txBuffer));
        transaction.sign([keypair]);
        const signedBytes = transaction.serialize();
        const signedTxBase64 = Buffer.from(signedBytes).toString('base64');

        await execute({
          requestId: orderResponse.requestId,
          signedTransaction: signedTxBase64,
        });
      }

      // Refresh balances for both wallets
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData.stealf_wallet] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData.cash_wallet] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history', userData.stealf_wallet] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history', userData.cash_wallet] });

      // Show success overlay
      setSuccessAmount(amount);
      setSuccessSymbol(selectedToken.tokenSymbol);
      setShowSuccess(true);
      successScale.setValue(0);
      successOpacity.setValue(0);
      checkScale.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(successScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.spring(checkScale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(successScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setShowSuccess(false);
          setAmount('');
          onBack();
        });
      }, 2000);

    } catch (error: any) {
      console.error('Move failed:', error);
      Alert.alert('Error', error?.message || 'Failed to move funds');
    } finally {
      setLoading(false);
    }
  };

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
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Move money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Balance Cards */}
        <View style={styles.balancesContainer}>
          {/* Source Card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>{sourceLabel}</Text>
                <TouchableOpacity
                  style={styles.tokenDropdown}
                  onPress={() => setTokenMenuOpen(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tokenDropdownText}>
                    {selectedToken ? `${selectedToken.balance.toFixed(3)} ${selectedToken.tokenSymbol}` : '—'}
                  </Text>
                  <Text style={[styles.tokenDropdownChevron, tokenMenuOpen && styles.tokenDropdownChevronOpen]}>
                    {'\u25BE'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardAmountRight, amount ? styles.cardAmountActive : null]}>
                -{amount || '0'}
              </Text>
            </View>

            {/* Token Menu */}
            {tokenMenuOpen && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tokenSelectorContainer}
                style={styles.tokenSelector}
              >
                {sourceTokens.map((token, index) => (
                  <TouchableOpacity
                    key={token.tokenMint || token.tokenSymbol}
                    style={[
                      styles.tokenChip,
                      index === selectedTokenIndex && styles.tokenChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedTokenIndex(index);
                      setTokenMenuOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.tokenChipSymbol,
                      index === selectedTokenIndex && styles.tokenChipSymbolSelected,
                    ]}>
                      {token.tokenSymbol}
                    </Text>
                    <Text style={[
                      styles.tokenChipBalance,
                      index === selectedTokenIndex && styles.tokenChipBalanceSelected,
                    ]}>
                      {token.balance.toFixed(3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Static Arrow */}
          <View style={styles.arrowButton}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <ArrowIcon width={24} height={24}/>
            </View>
          </View>

          {/* Destination Card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>{destLabel}</Text>
                <Text style={styles.balanceSubtext}>
                  destination
                </Text>
              </View>
              <Text style={[styles.cardAmountRight, amount ? styles.cardAmountActive : null]}>
                +{amount || '0'}
              </Text>
            </View>
          </View>
        </View>




        {/* Move Button */}
        <TouchableOpacity
          style={[styles.moveButton, loading && styles.moveButtonDisabled]}
          onPress={handleMove}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.moveButtonText}>{loading ? 'Moving...' : 'Move'}</Text>
        </TouchableOpacity>

        {/* Custom Keyboard */}
        <View style={styles.keyboard}>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('1')}>
              <Text style={styles.keyText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('2')}>
              <Text style={styles.keyText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('3')}>
              <Text style={styles.keyText}>3</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('4')}>
              <Text style={styles.keyText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('5')}>
              <Text style={styles.keyText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('6')}>
              <Text style={styles.keyText}>6</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('7')}>
              <Text style={styles.keyText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('8')}>
              <Text style={styles.keyText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('9')}>
              <Text style={styles.keyText}>9</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('.')}>
              <Text style={styles.keyText}>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleDelete}>
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Success Overlay */}
      <Modal visible={showSuccess} transparent animationType="none">
        <View style={styles.successOverlay}>
          <Animated.View style={[
            styles.successCard,
            { transform: [{ scale: successScale }], opacity: successOpacity },
          ]}>
            <Animated.View style={[
              styles.successCheckCircle,
              { transform: [{ scale: checkScale }] },
            ]}>
              <Text style={styles.successCheckMark}>✓</Text>
            </Animated.View>
            <Text style={styles.successTitle}>Sent</Text>
            <Text style={styles.successAmountText}>
              {successAmount} {successSymbol}
            </Text>
            <Text style={styles.successSubtext}>moved to {destLabel}</Text>
          </Animated.View>
        </View>
      </Modal>
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
  tokenSelector: {
    maxHeight: 44,
    marginTop: 12,
  },
  tokenSelectorContainer: {
    gap: 8,
  },
  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tokenChipSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tokenChipSymbol: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  tokenChipSymbolSelected: {
    color: '#ffffff',
  },
  tokenChipBalance: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
  tokenChipBalanceSelected: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balancesContainer: {
    paddingHorizontal: 40,
    marginTop: 8,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    minHeight: 100,
  },
  sourceCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
  },
  cardSpacer: {
    height: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardAmountRight: {
    fontSize: 38,
    color: 'rgba(255, 255, 255, 0.15)',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  cardAmountActive: {
    color: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 22,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
    marginBottom: 4,
  },
  minusSign: {
    fontSize: 28,
    color: 'white',
    fontFamily: 'Sansation-Light',
  },
  balanceAmount: {
    fontSize: 36,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
    marginBottom: 4,
    height: 45,
  },
  balanceSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  tokenDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tokenDropdownText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Sansation-Bold',
  },
  tokenDropdownChevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tokenDropdownChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: -24,
    zIndex: 10,
  },
  noteContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(45, 45, 45, 0.4)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notePlaceholder: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  noteCounter: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
  moveButton: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  moveButtonDisabled: {
    opacity: 0.5,
  },
  moveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Sansation-Bold',
  },
  keyboard: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  key: {
    width: 90,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    alignItems: 'center',
    paddingHorizontal: 50,
    paddingVertical: 40,
  },
  successCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheckMark: {
    fontSize: 40,
    color: '#000000',
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  successAmountText: {
    fontSize: 22,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
});
