import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, TouchableOpacity, Linking, RefreshControl, Modal, ScrollView } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import WalletSetupScreen, { WalletSetupChoice } from '../(auth)/WalletSetupScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupWallet } from '../../hooks/wallet/useInitPrivateWallet';
import { useAuthenticatedApi } from '../../services/api/clientStealf';
import { socketService } from '../../services/real-time/socketService';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';
import SendIcon from '../../assets/buttons/send.svg';
import ReceivedIcon from '../../assets/buttons/received.svg';
import type { PageType } from '../../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenMoove: () => void;
  onOpenSend: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenDepositPrivateCash: () => void;
  onOpenProfile: () => void;
  onOpenInfo: () => void;
  onOpenSavings: () => void;
  onShowLoader?: () => void;
  userEmail?: string;
  currentPage?: PageType;
}

export default function PrivacyScreen({
  onOpenMoove,
  onOpenSend,
  onOpenAddFundsPrivacy,
  onOpenDepositPrivateCash,
  onOpenInfo,
  onOpenSavings,
  onShowLoader,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [generatedMnemonic, setGeneratedMnemonic] = React.useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = React.useState<string | null>(null);
  const { userData, setUserData } = useAuth();
  const setupWallet = useSetupWallet();
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { transactions } = useWalletInfos(userData?.stealf_wallet || '');
  const [refreshing, setRefreshing] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  const hasPrivacyWallet = !!userData?.stealf_wallet;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['wallet-history', userData?.stealf_wallet] });
    setRefreshing(false);
  }, [userData?.stealf_wallet]);

  const handleWalletSetup = async (choice: WalletSetupChoice) => {
    if (choice.mode === 'create') {
      if (generatedMnemonic && pendingWalletAddress) {
        await registerPrivacyWallet(pendingWalletAddress);
        setGeneratedMnemonic(undefined);
        setPendingWalletAddress(null);
        return;
      }
      const result = await setupWallet.handleCreateWallet();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create wallet');
        return;
      }
      setPendingWalletAddress(result.walletAddress || '');
      setGeneratedMnemonic(result.mnemonic);
      return;
    }

    if (choice.mode === 'import') {
      const result = await setupWallet.handleImportWallet(choice.mnemonic);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to import wallet');
        return;
      }
      await registerPrivacyWallet(result.walletAddress || '');
    }
  };

  const registerPrivacyWallet = async (walletAddress: string) => {
    try {
      await api.post('/api/wallet/privacy-wallet', { walletAddress });
    } catch (err: any) {
      if (__DEV__) console.error('Failed to register privacy wallet:', err);
      Alert.alert('Error', err?.message || 'Failed to save wallet to server');
      return;
    }
    socketService.subscribeToWallet(walletAddress);
    if (onShowLoader) onShowLoader();
    if (userData) {
      setUserData({ ...userData, stealf_wallet: walletAddress });
    }
  };

  if (!hasPrivacyWallet) {
    return (
      <WalletSetupScreen
        onComplete={handleWalletSetup}
        loading={setupWallet.loading}
        generatedMnemonic={generatedMnemonic}
      />
    );
  }

  const getLabel = (tx: any) => tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Transaction';

  const ListHeader = () => (
    <>
      <View style={styles.headerSpacer} />

      <BalanceCardPrivacy
        onTopUp={onOpenAddFundsPrivacy}
        onWithdraw={onOpenSend}
        onExchange={onOpenMoove}
        onMore={onOpenInfo}
        onHide={onOpenDepositPrivateCash}
        onReveal={onOpenDepositPrivateCash}
        onSendHidden={onOpenSend}
        onGrow={onOpenSavings}
      />

      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Transactions</Text>
      </View>
    </>
  );

  const renderTransaction = ({ item: tx, index }: { item: any; index: number }) => (
    <TouchableOpacity
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ListHeader />

        {transactions.slice(0, 2).map((tx, index) => renderTransaction({ item: tx, index }))}

        {transactions.length > 2 && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllTx(true)} activeOpacity={0.7}>
            <Text style={styles.showMoreText}>Show all ({transactions.length})</Text>
          </TouchableOpacity>
        )}

        {transactions.length === 0 && <ListEmpty />}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252540',
  },
  listContent: {
    paddingBottom: 20,
  },
  txList: {
    maxHeight: 200,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSpacer: {
    height: 110,
  },
  activityHeader: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
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
    backgroundColor: '#252540',
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
