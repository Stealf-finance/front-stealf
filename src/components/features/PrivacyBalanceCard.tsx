import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useYieldBalance } from '../../services/yield/balance';

import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import MoreIcon from '../../assets/buttons/more.svg';

interface PrivacyBalanceCardProps {
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onExchange?: () => void;
  onMore?: () => void;
  onHide?: () => void;
  onReveal?: () => void;
  onSendHidden?: () => void;
  onGrow?: () => void;
}

export default function BalanceCardPrivacy({
  onTopUp,
  onWithdraw,
  onExchange,
  onMore,
  onHide,
  onReveal,
  onSendHidden,
  onGrow,
}: PrivacyBalanceCardProps) {
  const { userData } = useAuth();

  const { balance, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.stealf_wallet || ''
  );

  const { data: yieldBalance } = useYieldBalance();

  const visibleBalance = balance || 0;
  const [hiddenBalance, setHiddenBalance] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const totalBalance = visibleBalance + hiddenBalance;

  const handleAddHidden = async () => {
    setIsHiding(true);
    // Simulate transaction delay
    await new Promise(r => setTimeout(r, 2000));
    setHiddenBalance(prev => prev + 0.5);
    setIsHiding(false);
    Alert.alert('Success', '0.5 SOL moved to Hidden balance');
  };

  return (
    <View style={styles.container}>
      {/* Total balance */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Privacy Wallet</Text>
        {isLoadingBalance ? (
          <ActivityIndicator size="small" color="#ffffff" style={{ marginTop: 8 }} />
        ) : (
          <Text style={styles.totalAmount}>
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onTopUp} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onExchange} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MooveIcon />
          </View>
          <Text style={styles.actionText}>Moove</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onGrow} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <Ionicons name="trending-up" size={22} color="#ffffff" />
          </View>
          <Text style={styles.actionText}>Earn</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMore} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MoreIcon />
          </View>
          <Text style={styles.actionText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Balance breakdown — vertical cards */}
      <View style={styles.breakdownCards}>
        {/* Visible card */}
        <View style={styles.breakdownCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardTitle}>Visible</Text>
          </View>
          <Text style={styles.cardAmount}>
            {balanceError ? '$0.00' : `$${visibleBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
          <Text style={styles.cardDescription}>Your balance on the blockchain</Text>
        </View>

        {/* Hidden card */}
        <View style={styles.breakdownCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-off-outline" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardTitle}>Hidden</Text>
          </View>
          <Text style={styles.cardAmount}>
            ${hiddenBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.cardDescription}>
            {hiddenBalance === 0
              ? 'Add funds to enable hidden transactions and hidden balance'
              : 'Your balance and transactions are hidden from everyone'}
          </Text>
          <View style={styles.cardActions}>
            {hiddenBalance > 0 ? (
              <>
                <TouchableOpacity style={styles.cardButton} onPress={onSendHidden} activeOpacity={0.7}>
                  <Text style={styles.cardButtonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardButton} onPress={onReveal} activeOpacity={0.7}>
                  <Text style={styles.cardButtonText}>Withdraw</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.cardButtonAdd} onPress={handleAddHidden} activeOpacity={0.8} disabled={isHiding}>
                {isHiding ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.cardButtonAddText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
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
    fontFamily: 'Sansation-Regular',
  },
  breakdownCards: {
    gap: 12,
    marginBottom: 28,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
  },
  cardAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cardButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cardButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
  },
  cardButtonAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cardButtonAddText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
  },
  breakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    marginBottom: 28,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  breakdownRowHidden: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  breakdownRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  breakdownLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    marginBottom: 2,
  },
  breakdownSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontFamily: 'Sansation-Regular',
  },
  breakdownRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  breakdownAmount: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
  },
  hiddenHint: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontFamily: 'Sansation-Regular',
    marginTop: 8,
    paddingLeft: 25,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  addButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  hiddenActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  smallButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  growSection: {
    paddingTop: 4,
  },
  growTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
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
  growCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  growCardBalance: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
  },
  growCardDisabled: {
    opacity: 0.4,
  },
  growCardTitleDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  comingSoonText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Sansation-Regular',
  },
});
