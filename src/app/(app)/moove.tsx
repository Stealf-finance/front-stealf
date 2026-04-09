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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useShieldedBalance } from '../../hooks/wallet/useShieldedBalance';
import { useUmbra, UmbraError } from '../../hooks/transactions/useUmbra';
import { SOL_MINT } from '../../constants/solana';
import { toAddress } from '../../services/solana/kit';
import SlideToConfirm from '../../components/SlideToConfirm';
import ArrowIcon from '../../assets/buttons/arrow.svg';

export default function MooveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { direction: directionParam = 'toCash' } = useLocalSearchParams<{ direction?: string }>();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState(directionParam as 'toPrivacy' | 'toCash');
  const [showSuccess, setShowSuccess] = useState(false);
  const arrowRotation = useRef(new Animated.Value(directionParam === 'toCash' ? 1 : 0)).current;

  const [localLoading, setLocalLoading] = useState(false);

  const { userData } = useAuth();
  const hasStealthWallet = !!userData?.stealf_wallet;
  const queryClient = useQueryClient();
  const { balance: cashBalance, tokens: cashTokens } = useWalletInfos(userData?.cash_wallet || '');
  const { tokens: stealthTokens } = useWalletInfos(userData?.stealf_wallet || '');
  const { data: shielded } = useShieldedBalance();
  const { depositFromCash, selfShield, loading: umbraLoading } = useUmbra();

  const getSolPrice = (): number => {
    const allTokens = [...cashTokens, ...stealthTokens];
    const solToken = allTokens.find(t => t.tokenMint === null && t.balance > 0);
    if (solToken && solToken.balance > 0) {
      return solToken.balanceUSD / solToken.balance;
    }
    return 0;
  };

  const solPriceMemo = getSolPrice();
  const privacyBalance = (shielded?.sol ?? 0) * solPriceMemo;

  const isLoading = localLoading || umbraLoading;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const wealthDelta = direction === 'toCash' ? '-' : '+';
  const cashDelta = direction === 'toCash' ? '+' : '-';

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && num !== '.' && amount.split('.')[1].length >= 2) return;
    const digits = amount.replace('.', '');
    if (num !== '.' && digits.length >= 10) return;
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
    if (!userData?.cash_wallet || !userData?.stealf_wallet) return;

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
    const amountLamports = BigInt(Math.floor(amountSOL * LAMPORTS_PER_SOL));

    setLocalLoading(true);
    try {
      if (direction === 'toPrivacy') {
        // Single tx: cash wallet pays + signs (Turnkey), stealth receives the
        // encrypted balance credit. No intermediate public transfer needed.
        await depositFromCash(
          toAddress(userData.stealf_wallet),
          toAddress(SOL_MINT),
          amountLamports
        );
      } else {

        await selfShield(
          toAddress(SOL_MINT),
          amountLamports,
          toAddress(userData.cash_wallet)
        );
      }

      // Refresh all relevant caches
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData.cash_wallet] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData.stealf_wallet] });
      queryClient.invalidateQueries({ queryKey: ['shielded-balance'] });
      queryClient.invalidateQueries({ queryKey: ['pending-claims-cash'] });

      showSuccessAnimation();
    } catch (err: any) {
      if (__DEV__) console.error('[Moove] Transfer error:', err?.message, err);
      const friendly = err instanceof UmbraError
        ? err.userMessage
        : (err?.message || 'An error occurred');
      Alert.alert('Transfer Failed', friendly);
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

  if (!hasStealthWallet) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#000000', '#000000']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={{ flex: 1 }}
        >
          {/* Grabber */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}
          >
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
          </TouchableOpacity>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, minHeight: 500 }}>
            <Text style={{ color: '#f1ece1', fontSize: 22, fontFamily: 'Sansation-Bold', textAlign: 'center', marginBottom: 12 }}>
              No Stealth Wallet
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: 'Sansation-Regular', textAlign: 'center', marginBottom: 32 }}>
              Please import or create a stealth wallet to move funds.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#7C3AED',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 40,
              }}
            >
              <Text style={{ color: '#000100', fontSize: 16, fontFamily: 'Sansation-Bold' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Grabber — tap to close */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}
      >
        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
      </TouchableOpacity>

      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Move money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Wallet Cards */}
        <View style={styles.cardsContainer}>
          {/* Wealth — always on top */}
          <View style={styles.walletCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Encrypted balance</Text>
                <Text style={styles.cardBalance} accessibilityRole="text">{formatBalance(privacyBalance)}</Text>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[styles.cardAmount, amount ? styles.cardAmountActive : null, { flex: 1, textAlign: 'right' }]}>
                {wealthDelta}${amount || '0'}
              </Text>
            </View>
          </View>

          {/* Flip Arrow */}
          <TouchableOpacity style={styles.flipButton} onPress={handleFlip} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Swap transfer direction">
            <Animated.View style={{
              transform: [{
                rotate: arrowRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              }],
            }}>
              <ArrowIcon width={14} height={14} />
            </Animated.View>
          </TouchableOpacity>

          {/* Cash — always on bottom */}
          <View style={styles.walletCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Bank Wallet</Text>
                <Text style={styles.cardBalance} accessibilityRole="text">{formatBalance(cashBalance)}</Text>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[styles.cardAmount, amount ? styles.cardAmountActive : null, { flex: 1, textAlign: 'right' }]}>
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
                  accessibilityRole="button"
                  accessibilityLabel={key === '⌫' ? 'Delete' : key === '.' ? 'Decimal point' : key}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 100 }]}>
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
            <TouchableOpacity style={styles.secondaryAction} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.secondaryActionText}>Back to home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
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
    paddingTop: 16,
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
    gap: 8,
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
    color: '#f1ece1',
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
    color: '#f1ece1',
  },
  // Flip
  flipButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1ece1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: -21,
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
