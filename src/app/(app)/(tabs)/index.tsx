import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionHistory from '../../../components/TransactionHistory';
import CashBalanceCard from '../../../components/features/CashBalanceCard';
import AddFundsModal from '../../../components/AddFundsModal';
import SendModal from '../../../components/SendModal';
import SendIcon from '../../../assets/buttons/send.svg';
import { usePager } from '../../../navigation/PagerContext';
import { useAuth } from '../../../contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { currentPage, navigateToPage } = usePager();
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  const slideUpAnim = useSharedValue(100);

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleCloseAddFundsModal = () => {
    setShowAddFundsModal(false);
  };

  const handleSelectStablecoin = () => {
    setShowAddFundsModal(false);
    router.push('/(app)/add-funds');
  };

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    router.push('/(app)/deposit-private');
  };

  useEffect(() => {
    if (currentPage === 'home') {
      slideUpAnim.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      slideUpAnim.value = 100;
    }
  }, [currentPage]);

  const activityAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUpAnim.value }],
    opacity: 1 - slideUpAnim.value / 100,
  }));

  return (
    <View style={styles.container}>
        <View style={{ height: insets.top + 60 }} />

        <CashBalanceCard
          onDeposit={handleAddFundsPress}
          onMoove={() => router.push('/(app)/moove?direction=toPrivacy')}
          onSend={() => setShowSendModal(true)}
          onBank={() => router.push('/(app)/info?source=home')}
        />

        <View style={styles.bankCardWrapper}>
          <View style={styles.bankCard}>
            <Text style={styles.bankCardTitle}>Bank without limits</Text>

            <View style={styles.bankCardRow}>
              <Image
                source={require('../../../assets/stealf-card.png')}
                style={styles.cardImage}
                contentFit="contain"
                transition={200}
              />

              <View style={styles.bankCardRight}>
                <TouchableOpacity
                  style={styles.bankCardAction}
                  activeOpacity={0.7}
                  onPress={() => Alert.alert('Coming soon', 'Bank accounts will be available soon.')}
                  accessibilityRole="button"
                  accessibilityLabel="Get bank account"
                >
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
            activityAnimatedStyle,
          ]}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Transactions</Text>
          </View>
          <TransactionHistory limit={50} />
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
            router.push('/(app)/send?walletType=cash');
          }}
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
