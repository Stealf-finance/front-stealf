import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';

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

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onDeposit} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
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
        <TouchableOpacity style={styles.cardItem} activeOpacity={0.8}>
          <Image
            source={require('../../assets/stealf-card.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
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
    marginBottom: 32,
    paddingHorizontal: 10,
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
});
