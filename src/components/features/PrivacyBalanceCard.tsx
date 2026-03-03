import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';


import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import MoreIcon from '../../assets/buttons/more.svg';

interface PrivacyBalanceCardProps {
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onExchange?: () => void;
  onMore?: () => void;
}

export default function BalanceCardPrivacy({
  onTopUp,
  onWithdraw,
  onExchange,
  onMore
}: PrivacyBalanceCardProps) {

  const { userData } = useAuth();

  const { balance, tokens, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.stealf_wallet || ''
  );

  const totalUSD = balance || 0;

  return (
    <View style={styles.container}>
      {/* Total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total</Text>
        {isLoadingBalance ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : balanceError ? (
          <Text style={styles.totalAmount}>0</Text>
        ) : (
          <Text style={styles.totalAmount}>{totalUSD.toFixed(0)} USD</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onTopUp}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Shield</Text>
        </TouchableOpacity>

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
          onPress={onWithdraw}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <SendIcon />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

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
      </View>

      {/* Privacy cash */}
      <View style={styles.privacySection}>
        <Text style={styles.privacyLabel}>Privacy cash</Text>
        <Text style={styles.privacyAmount}>0 SOL</Text>
      </View>

      {/* Assets Section */}
      <View style={styles.assetsSection}>
        <Text style={styles.assetsTitle}>Assets</Text>
        {tokens.map((token) => (
          <View key={token.tokenMint || 'sol'} style={styles.assetRow}>
            <View style={styles.assetLeft}>
              <Text style={styles.assetSymbol}>{token.tokenSymbol}</Text>
              <Text style={styles.assetBalance}>{token.balance} {token.tokenSymbol}</Text>
            </View>
            <Text style={styles.assetUSD}>${token.balanceUSD.toFixed(2)}</Text>
          </View>
        ))}
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
  privacySection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 20,
    marginBottom: 16,
  },
  privacyLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'Sansation-Regular',
  },
  privacyAmount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
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
});