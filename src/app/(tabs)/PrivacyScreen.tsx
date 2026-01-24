import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Easing } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
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
            <BalanceCardPrivacy
              onWithdraw={onOpenSendPrivate}
              onTopUp={onOpenAddFundsPrivacy}
              onExchange={() => console.log('Exchange')}
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
              <Text style={styles.activityTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => onNavigateToPage('transactionHistory')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <TransactionHistory limit={2} walletType="privacy" />
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
});
