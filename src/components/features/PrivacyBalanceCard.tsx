import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useWealthStealthBalance } from '../../hooks/useWealthStealthBalance';
import { useConsolidateWealthStealth } from '../../hooks/useConsolidateWealthStealth';
import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import MoreIcon from '../../assets/buttons/more.svg';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
type DisplayMode = 'usd' | 'sol' | 'usdc';

interface PrivacyBalanceCardProps {
  onTopUp?: () => void;
  onExchange?: () => void;
  onMore?: () => void;
}

export default function BalanceCardPrivacy({
  onTopUp,
  onExchange,
  onMore
}: PrivacyBalanceCardProps) {

  const { userData } = useAuth();

  const { balance, tokens, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.stealf_wallet || ''
  );
  const { stealthBalance, stealthPayments, refreshBalance } = useWealthStealthBalance();
  const { isConsolidating, consolidate } = useConsolidateWealthStealth();

  const [displayMode, setDisplayMode] = useState<DisplayMode>('usd');
  const [claimSuccess, setClaimSuccess] = useState<{ consolidated: number } | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

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

  const MODES: { key: DisplayMode; label: string }[] = [
    { key: 'usd', label: 'Total' },
    { key: 'sol', label: 'SOL' },
    { key: 'usdc', label: 'USDC' },
  ];

  const handleClaim = async () => {
    if (!stealthPayments.length || isConsolidating) return;
    const result = await consolidate(stealthPayments);
    if (result && result.consolidated > 0) {
      setClaimSuccess({ consolidated: result.consolidated });
    }
  };

  return (
    <View style={styles.container}>
      {/* Balance + pills */}
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

      {/* Stealth claim card */}
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
                  onPress={handleClaim}
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
        <TouchableOpacity style={styles.actionButton} onPress={onTopUp} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onExchange} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MooveIcon />
          </View>
          <Text style={styles.actionText}>Moove</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMore} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MoreIcon />
          </View>
          <Text style={styles.actionText}>More</Text>
        </TouchableOpacity>
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
    color: '#00c878',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
  },
  successSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 52,
    marginBottom: 40,
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
});
