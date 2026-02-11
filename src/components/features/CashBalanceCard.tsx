import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';

// Import SVG icons
import DepositIcon from '../../assets/buttons/deposit.svg';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import BankIcon from '../../assets/buttons/bank.svg';

interface CashBalanceCardProps {
  onDeposit?: () => void;
  onMoove?: () => void;
  onSend?: () => void;
  onBank?: () => void;
}

export default function CashBalanceCard({
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
          onPress={onDeposit}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <DepositIcon />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onMoove}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <MooveIcon />
          </View>
          <Text style={styles.actionText}>Moove</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSend}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <SendIcon />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onBank}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <BankIcon />
          </View>
          <Text style={styles.actionText}>Infos</Text>
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
    marginBottom: 32,
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
});
