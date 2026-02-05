import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import AddFundsPrivacyModal from '../../components/AddFundsPrivacyModal';
import SendPrivacyModal from '../../components/SendPrivacyModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';
import { usePrivacyBalance } from '../../hooks/usePrivacyBalance';
import type { PageType } from '../../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSendPrivate: (transferType: 'basic' | 'private') => void;
  onOpenMoove: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenDepositPrivateCash: () => void;
  onOpenProfile: () => void;
  onOpenInfo: () => void;
  userEmail?: string;
  username?: string;
  currentPage?: PageType;
}

export default function PrivacyScreen({
  onNavigateToPage,
  onOpenSendPrivate,
  onOpenMoove,
  onOpenAddFundsPrivacy,
  onOpenDepositPrivateCash,
  onOpenProfile,
  onOpenInfo,
  userEmail,
  username,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendPrivacyModal, setShowSendPrivacyModal] = useState(false);
  const [selectedTransferType, setSelectedTransferType] = useState<'basic' | 'private' | null>(null);
  const slideUpAnim = useRef(new Animated.Value(100)).current;

  const { userData } = useAuth();
  const { balance: basicBalance } = useWalletInfos(userData?.stealf_wallet || '');
  const { totalUSD: privacyBalance } = usePrivacyBalance();

  useEffect(() => {
    if (currentPage === 'privacy') {
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      slideUpAnim.setValue(100);
    }
  }, [currentPage]);

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    onOpenDepositPrivateCash();
  };

  const handleSelectSimpleDeposit = () => {
    setShowAddFundsModal(false);
    onOpenAddFundsPrivacy();
  };

  const handleSendPress = () => {
    setShowSendPrivacyModal(true);
  };

  const handleSelectBasicTransfer = () => {
    setSelectedTransferType('basic');
    setShowSendPrivacyModal(false);
    onOpenSendPrivate('basic');
  };

  const handleSelectPrivateTransfer = () => {
    setSelectedTransferType('private');
    setShowSendPrivacyModal(false);
    onOpenSendPrivate('private');
  };

  return (
    <View style={styles.container}>
          {/* Header Spacer */}
          <View style={styles.headerSpacer} />

          {/* Balance Card */}
          <View style={styles.cardsContainer}>
            <BalanceCardPrivacy
              onWithdraw={handleSendPress}
              onTopUp={handleAddFundsPress}
              onExchange={onOpenMoove}
              onMore={onOpenInfo}
            />
          </View>

          {/* Recent Activity */}
          <Animated.View
            style={[
              styles.activityContainer,
              {
                transform: [{ translateY: slideUpAnim }],
                opacity: slideUpAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0],
                }),
              }
            ]}
          >
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Transactions</Text>
              <TouchableOpacity onPress={() => onNavigateToPage('transactionHistory')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <TransactionHistory limit={2} walletType="privacy" />
          </Animated.View>

          {/* Add Funds Modal */}
          <AddFundsPrivacyModal
            visible={showAddFundsModal}
            onClose={() => setShowAddFundsModal(false)}
            onSelectPrivateCash={handleSelectPrivateCash}
            onSelectSimpleDeposit={handleSelectSimpleDeposit}
          />

          {/* Send Privacy Modal */}
          <SendPrivacyModal
            visible={showSendPrivacyModal}
            onClose={() => setShowSendPrivacyModal(false)}
            onSelectBasicTransfer={handleSelectBasicTransfer}
            onSelectPrivateTransfer={handleSelectPrivateTransfer}
            username={username}
            basicTransferBalance={basicBalance || 0}
            privateTransferBalance={privacyBalance}
          />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    height: 110,
  },
  cardsContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 5,
    position: 'relative',
  },
  activityContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
    fontFamily: 'Sansation-Bold',
  },
});
