import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import TransactionHistory from '../../../components/TransactionHistory';
import CashBalanceCard from '../../../components/features/CashBalanceCard';
import SendIcon from '../../../assets/buttons/send.svg';
import { usePager } from '../../../navigation/PagerContext';
import { useAuth } from '../../../contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { currentPage } = usePager();
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showSendModal, setShowSendModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData?.cash_wallet] });
    await queryClient.invalidateQueries({ queryKey: ['wallet-history', userData?.cash_wallet] });
    setRefreshing(false);
  }, [queryClient, userData?.cash_wallet]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f1ece1" progressViewOffset={100} />}
      >
        <View style={{ height: insets.top + 60 }} />

        <CashBalanceCard
          onDeposit={() => router.push('/(app)/receive-select')}
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
                  <Text
                    style={styles.bankCardActionText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Get bank account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#f1ece1', fontSize: 18, fontFamily: 'Sansation-Bold' }}>
              Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/transaction-history?walletType=cash')}
              accessibilityRole="button"
              accessibilityLabel="See all transactions"
            >
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Sansation-Regular' }}>
                See all
              </Text>
            </TouchableOpacity>
          </View>
          <TransactionHistory limit={3} />
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  bankCardWrapper: {
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 28,
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
    color: '#f1ece1',
    fontFamily: 'Sansation-Bold',
    marginBottom: 18,
  },
  bankCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 110,
    height: 70,
    marginRight: 12,
  },
  bankCardRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  bankCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 26,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  bankCardActionText: {
    fontSize: 13,
    color: '#f1ece1',
    fontFamily: 'Sansation-Bold',
    flexShrink: 1,
  },
});
