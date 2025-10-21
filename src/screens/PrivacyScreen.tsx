import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Image, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { PrivacyBalanceCard } from '../components/features';
import PrivateTransactionHistory from '../components/PrivateTransactionHistory';
import NavigationBar from '../components/NavigationBar';
import type { PageType } from '../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSendPrivate: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenProfile: () => void;
  userEmail?: string;
  username?: string;
}

export default function PrivacyScreen({
  onNavigateToPage,
  onOpenSendPrivate,
  onOpenAddFundsPrivacy,
  onOpenProfile,
  userEmail,
  username,
}: PrivacyScreenProps) {
  const [selectedWallet, setSelectedWallet] = React.useState(0);

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
      } else if (gestureState.dx < -50) {
        // Swipe vers la gauche → Profile
        onOpenProfile();
      }
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
          {/* Header Spacer */}
          <View style={styles.headerSpacer} />

          {/* Cards Container with Tabs */}
          <View style={styles.cardsContainer}>
            {/* Wallet Tabs - Positioned above the card */}
            <View style={styles.tabsContainer}>
              {privateWallets.map((wallet, index) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletTab,
                    index === 0 && styles.walletTabFirst,
                    selectedWallet === index && styles.walletTabActive
                  ]}
                  onPress={() => setSelectedWallet(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.walletTabText,
                    selectedWallet === index && styles.walletTabTextActive
                  ]}>
                    {wallet.name}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Add Wallet Button */}
              <TouchableOpacity
                style={styles.walletTab}
                onPress={() => console.log('Add new wallet')}
                activeOpacity={0.7}
              >
                <Text style={styles.walletTabText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Balance Card */}
            <PrivacyBalanceCard
              walletId={privateWallets[selectedWallet]?.id}
              onWithdraw={onOpenSendPrivate}
              onTopUp={onOpenAddFundsPrivacy}
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
            <PrivateTransactionHistory limit={2} />
          </View>
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
    marginTop: 60,
    marginBottom: 10,
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
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    width: Math.min(Dimensions.get('window').width * 0.9, 400),
    marginBottom: -1,
    zIndex: 10,
  },
  walletTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(20, 12, 32, 0.6)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  walletTabActive: {
    backgroundColor: 'rgba(30, 20, 45, 1)',
  },
  walletTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  walletTabTextActive: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  walletTabFirst: {
    borderTopLeftRadius: 24,
  },
});
