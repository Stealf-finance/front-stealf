import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList, Linking, RefreshControl, Modal } from 'react-native';
import CashBalanceCard from '../../components/features/CashBalanceCard';
import AddFundsModal from '../../components/AddFundsModal';
import SendModal from '../../components/SendModal';
import SwapModal from '../../components/SwapModal';
import SendIcon from '../../assets/buttons/send.svg';
import ReceivedIcon from '../../assets/buttons/received.svg';
import type { PageType } from '../../navigation/types';
import { usePointsContext } from '../../contexts/PointsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';

interface HomeScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenProfile: () => void;
  onOpenAddFunds: () => void;
  onOpenSend: () => void;
  onOpenMoove?: () => void;
  onOpenDepositPrivateCash?: () => void;
  onOpenInfo: () => void;
  onOpenSavings?: () => void;
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
  onOpenSavings,
  currentPage = 'home',
}: HomeScreenProps) {
  const { points } = usePointsContext();
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const { transactions } = useWalletInfos(userData?.cash_wallet || '');

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['wallet-history', userData?.cash_wallet] });
    setRefreshing(false);
  }, [userData?.cash_wallet]);

  const handleAddFundsPress = () => setShowAddFundsModal(true);
  const handleCloseAddFundsModal = () => setShowAddFundsModal(false);
  const handleSelectStablecoin = () => { setShowAddFundsModal(false); onOpenAddFunds(); };
  const handleSelectPrivateCash = () => { setShowAddFundsModal(false); onOpenDepositPrivateCash?.(); };

  const getLabel = (tx: any) => tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Transaction';

  const ListHeader = () => (
    <>
      <View style={styles.headerSpacer} />

      <CashBalanceCard
        onDeposit={handleAddFundsPress}
        onMoove={onOpenMoove}
        onSend={() => setShowSendModal(true)}
        onSwap={() => setShowSwapModal(true)}
        onYield={onOpenSavings}
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
              <TouchableOpacity
                style={styles.bankCardAction}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Coming soon', 'Bank accounts will be available soon.')}
              >
                <SendIcon width={16} height={16} />
                <Text style={styles.bankCardActionText} numberOfLines={1}>Get bank account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Transactions</Text>
      </View>
    </>
  );

  const renderTransaction = ({ item: tx, index }: { item: any; index: number }) => (
    <TouchableOpacity
      key={`${tx.signature}-${index}`}
      style={styles.txRow}
      onPress={() => Linking.openURL(tx.signatureURL)}
      activeOpacity={0.7}
    >
      <View style={styles.txAvatar}>
        {tx.type === 'sent' ? (
          <SendIcon width={20} height={20} />
        ) : (
          <ReceivedIcon width={20} height={20} />
        )}
      </View>
      <View style={styles.txDetails}>
        <Text style={styles.txName}>{getLabel(tx)}</Text>
        <Text style={styles.txSubtitle}>{tx.dateFormatted} · {tx.tokenSymbol}</Text>
      </View>
      <Text style={styles.txAmount}>
        {tx.type === 'received' ? '+' : '-'}${tx.amountUSD.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No transactions yet</Text>
      <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ListHeader />

      {transactions.slice(0, 4).map((tx, index) => renderTransaction({ item: tx, index }))}

      {transactions.length > 4 && (
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllTx(true)} activeOpacity={0.7}>
          <Text style={styles.showMoreText}>Show all ({transactions.length})</Text>
        </TouchableOpacity>
      )}

      {transactions.length === 0 && <ListEmpty />}

      <Modal visible={showAllTx} animationType="slide" transparent onRequestClose={() => setShowAllTx(false)}>
        <View style={styles.txModalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAllTx(false)} />
          <View style={styles.txModalSheet}>
            <View style={styles.txModalHeader}>
              <Text style={styles.txModalTitle}>All Transactions</Text>
              <TouchableOpacity onPress={() => setShowAllTx(false)} style={styles.txModalClose}>
                <Text style={styles.txModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(tx, i) => `${tx.signature}-${i}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />
              }
            />
          </View>
        </View>
      </Modal>

      <AddFundsModal
        visible={showAddFundsModal}
        onClose={handleCloseAddFundsModal}
        onSelectStablecoin={handleSelectStablecoin}
        onSelectPrivateCash={handleSelectPrivateCash}
      />
      <SendModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSelectSimpleTransaction={() => { setShowSendModal(false); onOpenSend(); }}
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
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: 20,
  },
  txList: {
    maxHeight: 200,
  },
  headerSpacer: {
    height: 112,
  },
  activityHeader: {
    paddingHorizontal: 20,
    marginTop: 45,
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  bankCardWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 0,
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
  // Transaction rows
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txName: {
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
  },
  txSubtitle: {
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
  },
  txModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  txModalSheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  txModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  txModalTitle: {
    fontSize: 20,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
  },
  txModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(60,60,60,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txModalCloseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: 'rgba(255,255,255,0.5)',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.3)',
  },
});
