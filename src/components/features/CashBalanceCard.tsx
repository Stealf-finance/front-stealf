import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { usePendingClaimsForCash } from '../../hooks/wallet/usePendingClaimsForCash';

// Import SVG icons
import DepositIcon from '../../assets/buttons/deposit.svg';
import BankIcon from '../../assets/buttons/bank.svg';

interface CashBalanceCardProps {
  onDeposit?: () => void;
  onMoove?: () => void;
  onSend?: () => void;
  onBank?: () => void;
}

function CashBalanceCard({
  onDeposit,
  onMoove,
  onSend,
  onBank
}: CashBalanceCardProps) {

  const { userData } = useAuth();

  const { balance, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.cash_wallet || ''
  );

  const totalUSD = balance || 0;

  const { data: pendingClaims } = usePendingClaimsForCash();
  const pendingCount = pendingClaims?.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Available</Text>
        {isLoadingBalance ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : balanceError ? (
          <Text style={styles.totalAmount}>0</Text>
        ) : (
          <Text style={styles.totalAmount}>${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        )}
      </View>



      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={onDeposit}
          activeOpacity={0.7}
          delayPressIn={100}
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 14,
            borderCurve: 'continuous',
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <DepositIcon width={16} height={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Receive</Text>
          {pendingCount > 0 && (
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#ff3b30',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Sansation-Bold' }}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBank}
          activeOpacity={0.7}
          delayPressIn={100}
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 14,
            borderCurve: 'continuous',
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <BankIcon width={16} height={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Infos</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

export default React.memo(CashBalanceCard);

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
    marginBottom: 24,
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
    aspectRatio: 1.586, // Ratio standard d'une carte bancaire
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
});
