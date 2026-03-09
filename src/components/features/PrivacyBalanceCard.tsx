import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';


import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import MoreIcon from '../../assets/buttons/more.svg';

interface PrivacyBalanceCardProps {
  mode?: 'public' | 'private';
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onExchange?: () => void;
  onMore?: () => void;
  onSwap?: () => void;
  onBuy?: () => void;
  onShield?: () => void;
  onGrow?: () => void;
}

export default function BalanceCardPrivacy({
  mode = 'public',
  onTopUp,
  onWithdraw,
  onExchange,
  onMore,
  onSwap,
  onBuy,
  onShield,
  onGrow,
}: PrivacyBalanceCardProps) {

  const { userData } = useAuth();

  // Public balance — real on-chain wallet data
  const { balance: publicBalance, tokens: publicTokens, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.stealf_wallet || ''
  );

  // Private balance — Umbra deposits (TODO: replace with real hook)
  const privateBalance = 0;
  const privateTokens: typeof publicTokens = [];

  const isPrivate = mode === 'private';
  const totalUSD = isPrivate ? privateBalance : (publicBalance || 0);
  const displayTokens = isPrivate ? privateTokens : publicTokens;

  return (
    <View style={styles.container}>
      {/* Total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>{isPrivate ? 'Shielded Balance' : 'Public Balance'}</Text>
        {isLoadingBalance ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : balanceError ? (
          <Text style={styles.totalAmount}>0</Text>
        ) : (
          <Text style={styles.totalAmount}>${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {!isPrivate && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onTopUp}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <DepositIcon />
            </View>
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>
        )}

        {isPrivate && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onExchange}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MooveIcon />
              </View>
              <Text style={styles.actionText}>Moove</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSwap}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MooveIcon />
              </View>
              <Text style={styles.actionText}>Swap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onBuy}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <DepositIcon />
              </View>
              <Text style={styles.actionText}>Buy</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onWithdraw}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <SendIcon />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        {!isPrivate && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMore}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MoreIcon />
            </View>
            <Text style={styles.actionText}>More</Text>
          </TouchableOpacity>
        )}
      </View>


      {/* Shield CTA */}
      <TouchableOpacity
        style={styles.shieldButton}
        onPress={onShield}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shieldGradient}
        >
          <View style={styles.shieldIconCircle}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.shieldButtonText}>
            <Text style={styles.shieldButtonTitle}>Shield your assets</Text>
            <Text style={styles.shieldButtonSub}>Move funds to private with Umbra</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Assets Section */}
      <View style={styles.assetsSection}>
        <Text style={styles.assetsTitle}>Assets</Text>
        {displayTokens.length > 0 ? (
          displayTokens.map((token) => (
            <View key={token.tokenMint || 'sol'} style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <Text style={styles.assetSymbol}>{token.tokenSymbol}</Text>
                <Text style={styles.assetBalance}>{token.balance} {token.tokenSymbol}</Text>
              </View>
              <Text style={styles.assetUSD}>${token.balanceUSD.toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyAssets}>No assets yet</Text>
        )}
      </View>

      {/* Grow Section — private only */}
      {isPrivate && (
        <View style={styles.growSection}>
          <Text style={styles.growTitle}>Grow</Text>
          <TouchableOpacity style={styles.growCard} activeOpacity={0.8} onPress={onGrow}>
            <View style={styles.growCardLeft}>
              <View style={styles.growIconCircle}>
                <Ionicons name="trending-up" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.growCardTitle}>Earn yield privately</Text>
                <Text style={styles.growCardSub}>Up to 8% APY on stablecoins</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 24,
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'Sansation-Regular',
  },
  totalAmount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
    letterSpacing: -1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  shieldButton: {
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  shieldGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  shieldIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldButtonText: {
    flex: 1,
  },
  shieldButtonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Sansation-Bold',
  },
  shieldButtonSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
    marginTop: 3,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  assetsSection: {
    paddingTop: 20,
  },
  assetsTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
    marginBottom: 12,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  assetLeft: {
    flex: 1,
  },
  assetSymbol: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
    marginBottom: 2,
  },
  assetBalance: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  assetUSD: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
  },
  emptyAssets: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  growSection: {
    paddingTop: 24,
  },
  growTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
    marginBottom: 12,
  },
  growCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  growCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  growIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  growCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
  },
  growCardSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginTop: 2,
  },
});