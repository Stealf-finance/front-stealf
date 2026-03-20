import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Animated, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useCashStealthBalance } from '../../hooks/useCashStealthBalance';
import { useConsolidateCashStealth } from '../../hooks/useConsolidateCashStealth';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
type DisplayMode = 'usd' | 'sol' | 'usdc';

// Import SVG icons
import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import SwapIcon from '../../assets/buttons/swap.svg';

interface CashBalanceCardProps {
  onDeposit?: () => void;
  onMoove?: () => void;
  onSend?: () => void;
  onSwap?: () => void;
}

export default function CashBalanceCard({
  onDeposit,
  onMoove,
  onSend,
  onSwap,
}: CashBalanceCardProps) {

  const { userData } = useAuth();

  const { balance, tokens, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.cash_wallet || ''
  );
  const { stealthBalance, totalBalance: stealthTotalLamports, stealthPayments, refreshBalance } = useCashStealthBalance();
  const { isConsolidating, consolidate } = useConsolidateCashStealth();

  const [displayMode, setDisplayMode] = useState<DisplayMode>('usd');
  const [claimSuccess, setClaimSuccess] = useState<{ consolidated: number } | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const [showComingSoon, setShowComingSoon] = useState(false);
  const comingSoonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (claimSuccess) {
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setClaimSuccess(null);
          successOpacity.setValue(0);
          checkScale.setValue(0);
          refreshBalance();
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [claimSuccess]);

  const solToken = tokens.find(t => t.tokenMint === null);
  const usdcToken = tokens.find(t => t.tokenMint === USDC_MINT);

  // SOL balance total = main wallet SOL + stealth UTXOs (en lamports → SOL)
  const stealthSol = stealthBalance / 1_000_000_000;
  const totalSol = (solToken?.balance || 0) + stealthSol;

  const getBalanceParts = () => {
    if (displayMode === 'usd') {
      const [int, dec] = (balance || 0).toFixed(2).split('.');
      return { int, dec, symbol: 'USD' };
    }
    if (displayMode === 'sol') {
      const [int, dec] = totalSol.toFixed(4).split('.');
      return { int, dec, symbol: 'SOL' };
    }
    const [int, dec] = (usdcToken?.balance || 0).toFixed(2).split('.');
    return { int, dec, symbol: 'USDC' };
  };

  const handleCardPress = () => {
    comingSoonAnim.setValue(0);
    setShowComingSoon(true);
    Animated.timing(comingSoonAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const closeComingSoon = () => {
    Animated.timing(comingSoonAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setShowComingSoon(false);
    });
  };

  const MODES: { key: DisplayMode; label: string }[] = [
    { key: 'usd', label: 'Total' },
    { key: 'sol', label: 'SOL' },
    { key: 'usdc', label: 'USDC' },
  ];

  return (
    <View style={styles.container}>
      {/* Balance */}
      <View style={styles.totalSection}>
        <TouchableOpacity onPress={() => setDisplayMode(m => m === 'usd' ? 'sol' : m === 'sol' ? 'usdc' : 'usd')} activeOpacity={0.7}>
          {isLoadingBalance ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginBottom: 8 }} />
          ) : balanceError ? (
            <Text style={styles.totalAmount}>—</Text>
          ) : (
            <Text style={styles.totalAmount}>
              {getBalanceParts().int}
              <Text style={styles.totalAmountDecimals}>.{getBalanceParts().dec}</Text>
              <Text style={styles.totalAmountSymbol}> {getBalanceParts().symbol}</Text>
            </Text>
          )}
        </TouchableOpacity>

        {/* Pills selector */}
        <View style={styles.pillsRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.pill, displayMode === m.key && styles.pillActive]}
              onPress={() => setDisplayMode(m.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, displayMode === m.key && styles.pillTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stealth UTXOs indicator — visible seulement si stealthBalance > 0 ou success en cours */}
      {(stealthBalance > 0 || claimSuccess) && (
        <View style={styles.stealthSection}>
          <View style={styles.stealthCard}>
            {claimSuccess ? (
              <Animated.View style={[styles.successState, { opacity: successOpacity }]}>
                <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
                  <Text style={styles.successCheck}>✓</Text>
                </Animated.View>
                <Text style={styles.successTitle}>Funds claimed</Text>
              </Animated.View>
            ) : (
              <>
                <View style={styles.stealthCardHeader}>
                  <View>
                    <Text style={styles.stealthCardLabel}>Pending stealth funds</Text>
                    <Text style={styles.stealthCardAmount}>{stealthSol.toFixed(4)} SOL</Text>
                  </View>
                  <View style={styles.stealthCountBadge}>
                    <Text style={styles.stealthCountText}>{stealthPayments.length}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.claimButton, isConsolidating && { opacity: 0.5 }]}
                  activeOpacity={0.8}
                  disabled={isConsolidating}
                  onPress={async () => {
                    if (!userData?.cash_wallet) return;
                    const result = await consolidate(stealthPayments as any, userData.cash_wallet);
                    if (result) {
                      setClaimSuccess({ consolidated: result.consolidated });
                    }
                  }}
                >
                  {isConsolidating ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.claimButtonText}>Claim funds</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onDeposit} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMoove} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MooveIcon />
          </View>
          <Text style={styles.actionText}>Moove</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onSend} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <SendIcon />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onSwap} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <SwapIcon />
          </View>
          <Text style={styles.actionText}>Swap</Text>
        </TouchableOpacity>
      </View>

      {/* Cards Section */}
      <View style={styles.cardsSection}>
        <Text style={styles.cardsTitle}>Cards</Text>
        <TouchableOpacity style={styles.cardItem} activeOpacity={0.85} onPress={handleCardPress}>
          <Image
            source={require('../../assets/stealf-card.png')}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Modal transparent visible={showComingSoon} animationType="none" onRequestClose={closeComingSoon}>
          <TouchableOpacity style={styles.csOverlay} activeOpacity={1} onPress={closeComingSoon}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <Animated.View style={[styles.csCard, {
                opacity: comingSoonAnim,
                transform: [{ scale: comingSoonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
              }]}>
                <Image
                  source={require('../../assets/logo-transparent.png')}
                  style={styles.csLogo}
                  resizeMode="contain"
                />
                <Text style={styles.csTitle}>Coming Soon</Text>
                <Text style={styles.csMessage}>Card management is on its way.{'\n'}Stay tuned for the next update.</Text>
                <TouchableOpacity style={styles.csButton} onPress={closeComingSoon} activeOpacity={0.8}>
                  <Text style={styles.csButtonText}>Got it</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  totalSection: {
    marginBottom: 48,
  },
  totalAmountDecimals: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
  },
  totalAmountSymbol: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
  },
  totalAmount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
    letterSpacing: -1,
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  cardsSection: {
    marginTop: 8,
  },
  cardsTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
    marginBottom: 12,
  },
  cardItem: {
    width: '50%',
    aspectRatio: 1.586,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Sansation-Regular',
  },
  swapIcon: {
    color: '#ffffff',
    fontSize: 20,
  },
  csOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  csCard: {
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    borderRadius: 25,
    padding: 32,
    alignItems: 'center',
    width: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  csLogo: {
    width: 72,
    height: 72,
    marginBottom: 20,
  },
  csTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Sansation-Bold',
    fontWeight: '700',
    marginBottom: 10,
  },
  csMessage: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  csButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  csButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  stealthSection: {
    marginBottom: 24,
  },
  stealthCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    gap: 14,
  },
  stealthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stealthCardLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
  },
  stealthCardAmount: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
  },
  stealthCountBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stealthCountText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Sansation-Bold',
  },
  claimButton: {
    backgroundColor: '#ffffff',
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  successCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 200, 120, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 200, 120, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successCheck: {
    color: '#00c878',
    fontSize: 24,
    fontWeight: 'bold',
  },
  successTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  successSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
});
