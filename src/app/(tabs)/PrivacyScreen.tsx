import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Easing } from 'react-native';
import { BalanceCard } from '../../components/features';
import PrivateTransactionHistory from '../../components/PrivateTransactionHistory';
import type { PageType } from '../../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSendPrivate: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenProfile: () => void;
  userEmail?: string;
  username?: string;
  currentPage?: PageType;
}

export default function PrivacyScreen({
  onNavigateToPage,
  onOpenSendPrivate,
  onOpenAddFundsPrivacy,
  onOpenProfile,
  userEmail,
  username,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [selectedWallet, setSelectedWallet] = React.useState(0);

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

  // Liste des wallets privacy (à remplacer par des vraies données plus tard)
  const privateWallets = [
    { id: 1, name: '1' },
    { id: 2, name: '2' },
  ];

  // Pan Responder pour le swipe
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe vers la droite → Home
        onNavigateToPage('home');
      }
      // Swipe vers la gauche désactivé (ne fait plus rien)
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
          {/* Header Spacer */}
          <View style={styles.headerSpacer} />

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Privacy</Text>
          </View>

          {/* Balance Card */}
          <View style={styles.cardsContainer}>
            <BalanceCard
              onWithdraw={onOpenSendPrivate}
              onTopUp={onOpenAddFundsPrivacy}
              onExchange={() => console.log('Exchange')}
              isPrivacy={true}
              privacyAccountNumber={selectedWallet + 1}
            />
          </View>

          {/* Private Accounts Section */}
          <View style={styles.accountsContainer}>
            <Text style={styles.accountsTitle}>Private Accounts</Text>
            <View style={styles.accountsCarousel}>
              {/* Account 1 */}
              <TouchableOpacity
                style={[styles.accountCard, selectedWallet === 0 && styles.accountCardActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedWallet(0)}
              >
                <View style={styles.accountContent}>
                  <Text style={styles.accountNumber}>1</Text>
                  <Text style={styles.accountLabel}>Account</Text>
                </View>
              </TouchableOpacity>

              {/* Account 2 */}
              <TouchableOpacity
                style={[styles.accountCard, selectedWallet === 1 && styles.accountCardActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedWallet(1)}
              >
                <View style={styles.accountContent}>
                  <Text style={styles.accountNumber}>2</Text>
                  <Text style={styles.accountLabel}>Account</Text>
                </View>
              </TouchableOpacity>

              {/* Add Account Button */}
              <TouchableOpacity style={styles.accountCard} activeOpacity={0.8}>
                <View style={styles.addAccount}>
                  <Text style={styles.addAccountIcon}>+</Text>
                </View>
              </TouchableOpacity>
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
              <Text style={styles.activityTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => onNavigateToPage('transactionHistory')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <PrivateTransactionHistory limit={2} />
          </Animated.View>
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
    marginTop: 15,
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
  accountsContainer: {
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  accountsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: 'Sansation-Bold',
  },
  accountsCarousel: {
    flexDirection: 'row',
    gap: 8,
  },
  accountCard: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    backgroundColor: 'rgba(60, 40, 80, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(100, 80, 120, 0.3)',
  },
  accountCardActive: {
    backgroundColor: 'rgba(80, 60, 120, 0.5)',
    borderColor: 'rgba(150, 120, 200, 0.6)',
  },
  accountContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  accountNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Sansation-Regular',
  },
  addAccount: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 40, 80, 0.3)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(100, 80, 120, 0.5)',
  },
  addAccountIcon: {
    fontSize: 36,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '300',
  },
});
