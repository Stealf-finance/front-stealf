import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Image } from 'react-native';
import TransactionHistory from '../../components/TransactionHistory';
import CashBalanceCard from '../../components/features/CashBalanceCard';
import AddFundsModal from '../../components/AddFundsModal';
import SendModal from '../../components/SendModal';
import SwapModal from '../../components/SwapModal';
import SendIcon from '../../assets/buttons/send.svg';
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

        <View style={styles.bankCardWrapper}>
          <View style={styles.bankCard}>
            <Text style={styles.bankCardTitle}>Bank without limits</Text>

            <View style={styles.bankCardRow}>
              <Image
                source={require('../../assets/stealf-card.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />

              <View style={styles.bankCardRight}>
                <TouchableOpacity style={styles.bankCardAction} activeOpacity={0.7}>
                  <SendIcon width={16} height={16} />
                  <Text style={styles.bankCardActionText} numberOfLines={1}>Get bank account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  bankCardWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 35,
  },
  bankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  bankCardTitle: {
    fontSize: 22,
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 18,
  },
  bankCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 120,
    height: 76,
    marginRight: 16,
  },
  bankCardRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  bankCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Sansation-Regular',
  },
  bankCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
  },
  bankCardActionText: {
    fontSize: 13,
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
});
