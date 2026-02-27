import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import TransactionHistory from '../../components/TransactionHistory';
import CashBalanceCard from '../../components/features/CashBalanceCard';
import AddFundsModal from '../../components/AddFundsModal';
import SendModal from '../../components/SendModal';
import SwapModal from '../../components/SwapModal';
import type { PageType } from '../../navigation/types';
import { usePointsContext } from '../../contexts/PointsContext';

interface HomeScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenProfile: () => void;
  onOpenAddFunds: () => void;
  onOpenSend: () => void;
  onOpenMoove?: () => void;
  onOpenDepositPrivateCash?: () => void;
  onOpenInfo: () => void;
  userEmail?: string;
  username?: string;
  currentPage?: PageType;
}

export default function HomeScreen({
  onNavigateToPage,
  onOpenProfile,
  onOpenAddFunds,
  onOpenSend,
  onOpenMoove,
  onOpenDepositPrivateCash,
  onOpenInfo,
  currentPage = 'home',
}: HomeScreenProps) {
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const { points } = usePointsContext();

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleCloseAddFundsModal = () => {
    setShowAddFundsModal(false);
  };

  const handleSelectStablecoin = () => {
    setShowAddFundsModal(false);
    onOpenAddFunds();
  };

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    if (onOpenDepositPrivateCash) {
      onOpenDepositPrivateCash();
    }
  };

  useEffect(() => {
    if (currentPage === 'home') {
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

  return (
    <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <CashBalanceCard
          onDeposit={handleAddFundsPress}
          onMoove={onOpenMoove}
          onSend={() => setShowSendModal(true)}
          onSwap={() => setShowSwapModal(true)}
        />

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
          </View>
          <TransactionHistory limit={50} compact />
        </Animated.View>

        {/* Add Funds Modal */}
        <AddFundsModal
          visible={showAddFundsModal}
          onClose={handleCloseAddFundsModal}
          onSelectStablecoin={handleSelectStablecoin}
          onSelectPrivateCash={handleSelectPrivateCash}
        />

        <SendModal
          visible={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSelectSimpleTransaction={() => {
            setShowSendModal(false);
            onOpenSend();
          }}
        />

        <SwapModal
          visible={showSwapModal}
          onClose={() => setShowSwapModal(false)}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  headerSpacer: {
    height: 110,
  },
  activityContainer: {
    flex: 1,
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
});
