import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';
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

  const [displayMode, setDisplayMode] = useState<DisplayMode>('usd');

  const solToken = tokens.find(t => t.tokenMint === null);
  const usdcToken = tokens.find(t => t.tokenMint === USDC_MINT);

  const getBalanceParts = () => {
    if (displayMode === 'usd') {
      const [int, dec] = (balance || 0).toFixed(2).split('.');
      return { int, dec, symbol: 'USD' };
    }
    if (displayMode === 'sol') {
      const [int, dec] = (solToken?.balance || 0).toFixed(4).split('.');
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
