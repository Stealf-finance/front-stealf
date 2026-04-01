import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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
  const { currentPage } = usePager();
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: insets.top + 60 }} />

        <CashBalanceCard
          onDeposit={() => setShowAddFundsModal(true)}
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

        {/* Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold' }}>
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

      <AddFundsModal
        visible={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        onSelectStablecoin={() => { setShowAddFundsModal(false); router.push('/(app)/add-funds'); }}
        onSelectPrivateCash={() => { setShowAddFundsModal(false); router.push('/(app)/shield'); }}
      />

      <SendModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSelectSimpleTransaction={() => { setShowSendModal(false); router.push('/(app)/send?walletType=cash'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
