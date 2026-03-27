import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  const hiddenBalance = 0; // Umbra — wired later
  const totalBalance = visibleBalance + hiddenBalance;

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
          <Text style={styles.actionText}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onWithdraw} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <SendIcon />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMore} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MoreIcon />
          </View>
          <Text style={styles.actionText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Balance breakdown */}
      <View style={styles.breakdown}>
        {/* Visible row */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.5)" />
            <View>
              <Text style={styles.breakdownLabel}>Visible</Text>
              <Text style={styles.breakdownSub}>Your balance on the blockchain</Text>
            </View>
          </View>
          <Text style={styles.breakdownAmount}>
            {balanceError ? '$0.00' : `$${visibleBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
        </View>

        <View style={styles.separator} />

        {/* Hidden row */}
        <View style={styles.breakdownRowHidden}>
          <View style={styles.breakdownRowTop}>
            <View style={styles.breakdownLeft}>
              <Ionicons name="eye-off-outline" size={15} color="rgba(255,255,255,0.5)" />
              <View>
                <Text style={styles.breakdownLabel}>Hidden</Text>
                <Text style={styles.breakdownSub}>
                  {hiddenBalance === 0
                    ? 'Add funds to make them invisible on-chain'
                    : 'Your funds are hidden from everyone'}
                </Text>
              </View>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownAmount}>
                ${hiddenBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {hiddenBalance > 0 ? (
                <View style={styles.hiddenActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={onSendHidden} activeOpacity={0.7}>
                    <Text style={styles.smallButtonText}>Send</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallButton} onPress={onReveal} activeOpacity={0.7}>
                    <Text style={styles.smallButtonText}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addButton} onPress={onHide} activeOpacity={0.8}>
                  <Ionicons name="add" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>
      </View>

      {/* Grow section */}
      <View style={styles.growSection}>
        <Text style={styles.growTitle}>Grow</Text>

        <TouchableOpacity style={styles.growCard} activeOpacity={0.8} onPress={onGrow}>
          <View style={styles.growCardLeft}>
            <View style={styles.growIconCircle}>
              <Ionicons name="trending-up" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.growCardTitle}>Jito SOL</Text>
              <Text style={styles.growCardSub}>Up to 6% APY</Text>
            </View>
          </View>
          <View style={styles.growCardRight}>
            <Text style={styles.growCardBalance}>
              {yieldBalance != null ? `${yieldBalance.toFixed(2)} SOL` : '—'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </View>
        </TouchableOpacity>

        <View style={[styles.growCard, styles.growCardDisabled]}>
          <View style={styles.growCardLeft}>
            <View style={styles.growIconCircle}>
              <Ionicons name="bar-chart" size={20} color="rgba(255,255,255,0.3)" />
            </View>
            <View>
              <Text style={[styles.growCardTitle, styles.growCardTitleDisabled]}>S&P 500</Text>
              <Text style={styles.growCardSub}>Coming soon</Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View style={[styles.growCard, styles.growCardDisabled]}>
          <View style={styles.growCardLeft}>
            <View style={styles.growIconCircle}>
              <Ionicons name="diamond" size={20} color="rgba(255,255,255,0.3)" />
            </View>
            <View>
              <Text style={[styles.growCardTitle, styles.growCardTitleDisabled]}>Gold</Text>
              <Text style={styles.growCardSub}>Coming soon</Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
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
    marginBottom: 28,
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
    fontFamily: 'Sansation-Regular',
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
