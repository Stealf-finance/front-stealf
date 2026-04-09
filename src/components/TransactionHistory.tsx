import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import { useWalletInfos } from '../hooks/wallet/useWalletInfos';
import SendIcon from '../assets/buttons/send.svg';
import ReceivedIcon from '../assets/buttons/received.svg';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface TransactionHistoryProps {
  limit?: number;
  style?: any;
  walletType?: 'cash' | 'privacy';
  flat?: boolean;
  /** When true, each row is tappable and opens the transaction on Solscan. */
  clickable?: boolean;
}

interface Transaction {
  signature: string;
  amount: number;
  amountUSD: number;
  tokenMint: string | null;
  tokenSymbol: string;
  tokenDecimals: number;
  signatureURL: string;
  walletAddress: string;
  dateFormatted: string;
  status: string;
  type: 'sent' | 'received' | 'unknown';
  slot: number;
}

function getLabel(tx: Transaction) {
  return tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Transaction';
}

const TransactionRow = React.memo(function TransactionRow({
  tx,
  clickable,
}: {
  tx: Transaction;
  clickable?: boolean;
}) {
  const content = (
    <>
      <View style={styles.avatar}>
        {tx.type === 'sent' ? (
          <SendIcon width={20} height={20} />
        ) : (
          <ReceivedIcon width={20} height={20} />
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.name}>{getLabel(tx)}</Text>
        <Text style={styles.subtitle}>
          {tx.dateFormatted} · {tx.tokenSymbol}
        </Text>
      </View>

      <Text style={styles.amount}>
        {tx.type === 'received' ? '+' : '-'}${tx.amountUSD.toFixed(2)}
      </Text>
    </>
  );

  if (clickable) {
    const url = tx.signatureURL || `https://solscan.io/tx/${tx.signature}?cluster=devnet`;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.6}
        onPress={() => Linking.openURL(url).catch(() => {})}
        accessibilityRole="link"
        accessibilityLabel={`${getLabel(tx)} ${tx.amountUSD.toFixed(2)} dollars ${tx.tokenSymbol}, view on Solscan`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${getLabel(tx)} ${tx.amountUSD.toFixed(2)} dollars ${tx.tokenSymbol}`}
    >
      {content}
    </View>
  );
});

export default function TransactionHistory({
  limit = 3,
  style,
  walletType = 'cash',
  flat = false,
  clickable = false,
}: TransactionHistoryProps) {

  const { userData } = useAuth();
  const queryClient = useQueryClient();

  const wallet = walletType === 'privacy'
    ? userData?.stealf_wallet
    : userData?.cash_wallet;

  const {
    transactions,
    isLoading,
    historyError,
  } = useWalletInfos(wallet || '');

  const displayedTransactions = transactions.slice(0, limit);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ['wallet-history', wallet],
    });
    setRefreshing(false);
  }, [queryClient, wallet]);

  const isCompactMode = flat || limit <= 3;

  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionRow tx={item} clickable={clickable} />
  ), [clickable]);

  const keyExtractor = useCallback((item: Transaction) => item.signature, []);

  if (isLoading && displayedTransactions.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (historyError) {
    return (
      <View style={[styles.container, style]}>
        <Text selectable style={styles.errorText}>{historyError.message || 'Failed to load transactions'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading transactions"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (displayedTransactions.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
      </View>
    );
  }

  if (isCompactMode) {
    return (
      <View style={[styles.compactContainer, style]}>
        {displayedTransactions.map(tx => (
          <TransactionRow key={tx.signature} tx={tx} clickable={clickable} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={displayedTransactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactContainer: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Sansation-Regular',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    fontVariant: ['tabular-nums'],
    marginLeft: 12,
  },
  loadingText: {
    color: '#f1ece1',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Sansation-Regular',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderCurve: 'continuous',
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Sansation-Bold',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
});
