import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Animated, PanResponder, Dimensions, Easing } from 'react-native';
import { BalanceCard } from '../components/features';
import TransactionHistory from '../components/TransactionHistory';
import NavigationBar from '../components/NavigationBar';
import CardScreen from './CardScreen';
import type { PageType } from '../navigation/types';

interface HomeScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSend: () => void;
  onOpenAddFunds: () => void;
  onOpenProfile: () => void;
  onCardScreenChange?: (isOpen: boolean) => void;
  userEmail?: string;
  username?: string;
}

export default function HomeScreen({
  onNavigateToPage,
  onOpenSend,
  onOpenAddFunds,
  onOpenProfile,
  onCardScreenChange,
  userEmail,
  username,
}: HomeScreenProps) {
  const [showCardScreen, setShowCardScreen] = useState(false);

  // Pan Responder pour le swipe
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !showCardScreen,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return !showCardScreen && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50) {
        onNavigateToPage('privacy');
      }
    },
  });

  const handleCardPress = () => {
    if (showCardScreen) return; // Empêcher double clic
    setShowCardScreen(true);
    onCardScreenChange?.(true);
  };

  const handleCloseCard = () => {
    setShowCardScreen(false);
    onCardScreenChange?.(false);
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
        {/* Header Spacer */}
        <View style={styles.headerSpacer} />

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Stealf Card (behind) */}
          {!showCardScreen && (
            <View style={styles.stealthCardContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleCardPress}
            >
              <ImageBackground
                source={require('../../assets/stealf-card.png')}
                style={styles.stealthCardImage}
                resizeMode="cover"
                imageStyle={{ borderRadius: 20 }}
              />
            </TouchableOpacity>

            {/* Arrow indicator */}
            <TouchableOpacity
              style={styles.arrowIndicator}
              onPress={handleCardPress}
              activeOpacity={0.7}
            >
              <Text style={styles.arrowText}>⌄</Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Balance Card (in front with notch) */}
          <BalanceCard
            onWithdraw={onOpenSend}
            onTopUp={onOpenAddFunds}
            onExchange={() => console.log('Exchange')}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => onNavigateToPage('transactionHistory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <TransactionHistory limit={2} />
        </View>

        {/* Card Detail Screen */}
        {showCardScreen && <CardScreen onClose={handleCloseCard} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    height: 110,
  },
  cardsContainer: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 10,
    position: 'relative',
  },
  stealthCardContainer: {
    position: 'absolute',
    top: -60,
    width: '85%',
    maxWidth: 320,
    height: 200,
    alignSelf: 'center',
    borderRadius: 20,
    zIndex: 1,
  },
  stealthCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  comingSoonContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comingSoonText: {
    color: '#333',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
    letterSpacing: 0.5,
  },
  arrowIndicator: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 10,
  },
  arrowText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  activityContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
});
