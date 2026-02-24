import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import AddFundsPrivacyModal from '../../components/AddFundsPrivacyModal';
import type { PageType } from '../../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
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
  onOpenMoove,
  onOpenAddFundsPrivacy,
  onOpenInfo,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const slideUpAnim = useRef(new Animated.Value(100)).current;


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

  const handleSelectSimpleDeposit = () => {
    setShowAddFundsModal(false);
    onOpenAddFundsPrivacy();
  };

  return (
    <View style={styles.container}>
          <View style={styles.headerSpacer} />
          <View style={styles.cardsContainer}>
            <BalanceCardPrivacy
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
            </View>
            <TransactionHistory limit={50} compact walletType="privacy" />
          </Animated.View>

          {/* Add Funds Modal */}
          <AddFundsPrivacyModal
            visible={showAddFundsModal}
            onClose={() => setShowAddFundsModal(false)}
onSelectSimpleDeposit={handleSelectSimpleDeposit}
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
  stealthReceiveButton: {
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  stealthReceiveText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
  },
  stealthPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  stealthPaymentAmount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
  },
  stealthPaymentStatus: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Sansation-Regular',
  },
  spendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  spendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Sansation-Bold',
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
