import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useSendTransaction } from '../../hooks/transactions/useSendSimpleTransaction';
import { walletKeyCache } from '../../services/cache/walletKeyCache';
import SlideToConfirm from '../../components/SlideToConfirm';
import ArrowIcon from '../../assets/buttons/arrow.svg';
import ComebackIcon from '../../assets/buttons/comeback.svg';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

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
  const storedKey = await walletKeyCache.getPrivateKey();
  if (storedKey) {
    const secretKey = bs58.decode(storedKey);
    return Keypair.fromSecretKey(secretKey);
  }
  const storedMnemonic = walletKeyCache.getMnemonic();
  if (storedMnemonic) {
    const seed = await bip39.mnemonicToSeed(storedMnemonic);
    const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));
    return Keypair.fromSeed(key);
  }
  throw new Error('No privacy wallet key found');
}

interface MooveScreenProps {
  onBack: () => void;
  direction?: 'toPrivacy' | 'toCash';
}

export default function MooveScreen({ onBack, direction: initialDirection = 'toCash' }: MooveScreenProps) {
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState(initialDirection);
  const [showSuccess, setShowSuccess] = useState(false);
  const arrowRotation = useRef(new Animated.Value(initialDirection === 'toCash' ? 1 : 0)).current;

  const [localLoading, setLocalLoading] = useState(false);

  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const { balance: cashBalance, tokens: cashTokens } = useWalletInfos(userData?.cash_wallet || '');
  const { balance: privacyBalance, tokens: privacyTokens } = useWalletInfos(userData?.stealf_wallet || '');
  const { sendTransaction, loading: turnkeyLoading } = useSendTransaction();

  // Derive SOL price from whichever wallet has SOL tokens
  const getSolPrice = (): number => {
    const allTokens = [...cashTokens, ...privacyTokens];
    const solToken = allTokens.find(t => t.tokenMint === null && t.balance > 0);
    if (solToken && solToken.balance > 0) {
      return solToken.balanceUSD / solToken.balance;
    }
    return 0;
  };

  const isLoading = localLoading || turnkeyLoading;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const fromAddress = direction === 'toCash' ? userData?.stealf_wallet : userData?.cash_wallet;
  const toAddress = direction === 'toCash' ? userData?.cash_wallet : userData?.stealf_wallet;

  const wealthDelta = direction === 'toCash' ? '-' : '+';
  const cashDelta = direction === 'toCash' ? '+' : '-';

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) return null;

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && num !== '.' && amount.split('.')[1].length >= 2) return;
    const digits = amount.replace('.', '');
    if (num !== '.' && digits.length >= 8) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleFlip = useCallback(() => {
    const next = direction === 'toCash' ? 'toPrivacy' : 'toCash';
    setDirection(next);
    Animated.spring(arrowRotation, {
      toValue: next === 'toCash' ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [direction, arrowRotation]);

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleMove = async () => {
    const amountUSD = parseFloat(amount);
    if (!amount || isNaN(amountUSD) || amountUSD <= 0) return;
    if (!fromAddress || !toAddress) return;

    const sourceBalance = direction === 'toCash' ? privacyBalance : cashBalance;
    if (sourceBalance !== undefined && amountUSD > sourceBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    const solPrice = getSolPrice();
    if (solPrice <= 0) {
      Alert.alert('Error', 'Unable to get SOL price');
      return;
    }
    const amountSOL = Math.floor((amountUSD / solPrice) * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;

    try {
      if (direction === 'toPrivacy') {
        // Cash → Wealth: sign with Turnkey
        await sendTransaction(fromAddress, toAddress, amountSOL);
      } else {
        // Wealth → Cash: sign locally with privacy keypair
        setLocalLoading(true);
        const keypair = await getPrivacyKeypair();
        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(toAddress);

        const { blockhash } = await connection.getLatestBlockhash('finalized');
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
          })
        );

        transaction.sign(keypair);
        await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        walletKeyCache.touch();
      }

      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData?.cash_wallet] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData?.stealf_wallet] });

      showSuccessAnimation();
    } catch (err: any) {
      console.error('[Moove] Transfer error:', err?.message);
      Alert.alert('Transfer Failed', err?.message || 'An error occurred');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleNewMove = () => {
    setAmount('');
    setShowSuccess(false);
    fadeAnim.setValue(0);
    checkScale.setValue(0);
    contentFade.setValue(0);
  };

  const formatBalance = (bal: number | undefined) => {
    if (bal === undefined) return '—';
    return `$${bal.toFixed(2)}`;
  };

  if (showSuccess) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkText}>{'✓'}</Text>
          </Animated.View>

          <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
            <Text style={styles.successLabel}>Moved</Text>
            <Text style={styles.successAmount}>${amount}</Text>
            <Text style={styles.successRoute}>
              {direction === 'toCash' ? 'Stealth → Cash' : 'Cash → Stealth'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
            <TouchableOpacity style={styles.primaryAction} onPress={handleNewMove} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Move again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={onBack} activeOpacity={0.8}>
              <Text style={styles.secondaryActionText}>Back to home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
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
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Move money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Wallet Cards */}
        <View style={styles.cardsContainer}>
          {/* Wealth — always on top */}
          <View style={styles.walletCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Stealth</Text>
                <Text style={styles.cardBalance}>{formatBalance(privacyBalance)}</Text>
              </View>
              <Text style={[styles.cardAmount, amount ? styles.cardAmountActive : null]}>
                {wealthDelta}${amount || '0'}
              </Text>
            </View>
          </View>

          {/* Flip Arrow */}
          <TouchableOpacity style={styles.flipButton} onPress={handleFlip} activeOpacity={0.7}>
            <Animated.View style={{
              transform: [{
                rotate: arrowRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              }],
            }}>
              <ArrowIcon width={22} height={22} />
            </Animated.View>
          </TouchableOpacity>

          {/* Cash — always on bottom */}
          <View style={styles.walletCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Cash</Text>
                <Text style={styles.cardBalance}>{formatBalance(cashBalance)}</Text>
              </View>
              <Text style={[styles.cardAmount, amount ? styles.cardAmountActive : null]}>
                {cashDelta}${amount || '0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Slide to Move */}
        <View style={styles.slideContainer}>
          <SlideToConfirm onConfirm={handleMove} loading={isLoading} label="Slide to move" />
        </View>

        {/* Custom Keyboard */}
        <View style={styles.keyboard}>
          {[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','⌫']].map((row, i) => (
            <View key={i} style={styles.keyboardRow}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={styles.key}
                  onPress={() => key === '⌫' ? handleDelete() : handleNumberPress(key)}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  // Cards
  cardsContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },
  walletCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBalance: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  cardAmount: {
    fontSize: 36,
    color: 'rgba(255, 255, 255, 0.12)',
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
  },
  cardAmountPositive: {},
  cardAmountActive: {
    color: '#ffffff',
  },
  // Flip
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: -22,
    zIndex: 10,
  },
  // Slide
  slideContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  // Keyboard
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
  // Success
  successScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  checkText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
  successInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  successLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 36,
    color: 'white',
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
    marginBottom: 12,
  },
  successRoute: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryAction: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  secondaryAction: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
});
