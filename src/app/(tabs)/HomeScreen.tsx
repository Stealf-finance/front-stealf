import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Animated, PanResponder, Easing } from 'react-native';
import { BalanceCard } from '../../components/features';
import TransactionHistory from '../../components/TransactionHistory';
import CardScreen from '../(infos)/CardScreen';
import AddFundsModal from '../../components/AddFundsModal';
import SendModal from '../../components/SendModal';
import type { PageType } from '../../navigation/types';

interface HomeScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSend: () => void;
  onOpenAddFunds: () => void;
  onOpenProfile: () => void;
  onOpenInfo: () => void;
  onCardScreenChange?: (isOpen: boolean) => void;
  userEmail?: string;
  username?: string;
  currentPage?: PageType;
}

export default function HomeScreen({
  onNavigateToPage,
  onOpenSend,
  onOpenAddFunds,
  onOpenProfile,
  onOpenInfo,
  onCardScreenChange,
  userEmail,
  username,
  currentPage = 'home',
}: HomeScreenProps) {
  const [showCardScreen, setShowCardScreen] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const slideUpAnim = useRef(new Animated.Value(100)).current;

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

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleSelectStablecoin = () => {
    setShowAddFundsModal(false);
    onOpenAddFunds();
  };

  const handleSendPress = () => {
    setShowSendModal(true);
  };

  const handleSelectStablecoinSend = () => {
    setShowSendModal(false);
    onOpenSend();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
        {/* Header Spacer */}
        <View style={styles.headerSpacer} />

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Cash</Text>
        </View>

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Balance Card */}
          <BalanceCard
            onWithdraw={handleSendPress}
            onTopUp={handleAddFundsPress}
            onExchange={onOpenInfo}
          />
        </View>

        {/* Cards Section */}
        <View style={styles.cardsCarouselContainer}>
          <Text style={styles.cardsTitle}>Cards</Text>
          <View style={styles.cardsCarousel}>
            {/* Stealf Card */}
            {!showCardScreen && (
              <TouchableOpacity
                style={styles.miniCard}
                activeOpacity={0.6}
                disabled
              >
                <ImageBackground
                  source={require('../../assets/stealf-card.png')}
                  style={styles.miniCardImage}
                  resizeMode="cover"
                  imageStyle={{ borderRadius: 16 }}
                />
                <View style={styles.comingSoonOverlay}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* gMPC Card */}
            {!showCardScreen && (
              <TouchableOpacity
                style={styles.miniCard}
                activeOpacity={0.6}
                disabled
              >
                <ImageBackground
                  source={require('../../assets/gMPC-card.png')}
                  style={styles.miniCardImage}
                  resizeMode="cover"
                  imageStyle={{ borderRadius: 16 }}
                />
                <View style={styles.comingSoonOverlay}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
            )}
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
          <TransactionHistory limit={2} />
        </Animated.View>

        {/* Card Detail Screen */}
        {showCardScreen && <CardScreen onClose={handleCloseCard} />}

        {/* Add Funds Modal */}
        <AddFundsModal
          visible={showAddFundsModal}
          onClose={() => setShowAddFundsModal(false)}
          onSelectStablecoin={handleSelectStablecoin}
        />

        {/* Send Modal */}
        <SendModal
          visible={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSelectStablecoin={handleSelectStablecoinSend}
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
    marginTop: 15,
    marginBottom: 5,
    position: 'relative',
  },
  cardsCarouselContainer: {
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  cardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: 'Sansation-Bold',
  },
  cardsCarousel: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    width: '48%',
    height: 100,
    borderRadius: 16,
  },
  miniCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  addCard: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(60, 60, 60, 0.5)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(100, 100, 100, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardIcon: {
    fontSize: 36,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '300',
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
