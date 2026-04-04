import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletInfos } from '../hooks/wallet/useWalletInfos';
import SendIcon from '../assets/buttons/send.svg';
import ReceivedIcon from '../assets/buttons/received.svg';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface TransactionHistoryProps {
  limit?: number;
  style?: any;
  walletType?: 'cash' | 'privacy';
  compact?: boolean;
  scrollable?: boolean;
}

export default function TransactionHistory({
  limit = 3,
  style,
  walletType = 'cash',
  compact = false,
  scrollable = false,
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
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ['wallet-history', wallet],
    });
    setRefreshing(false);
  };

  const isCompactMode = compact || limit <= 3;

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
        <Text style={styles.errorText}>{historyError.message || 'Failed to load transactions'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (displayedTransactions.length === 0) {
    if (walletType === 'privacy') {
      return (
        <View style={[styles.emptyPrivacyContainer, style]}>
          <View style={styles.emptyPrivacyRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="rgba(139,92,246,0.6)" />
            <Text style={styles.emptyPrivacyText}>No private transactions yet</Text>
          </View>
          <View style={styles.emptyPrivacyFeatures}>
            <View style={styles.emptyPrivacyFeature}>
              <Ionicons name="eye-off-outline" size={13} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyPrivacyFeatureText}>One-time stealth addresses</Text>
            </View>
            <View style={styles.emptyPrivacyFeature}>
              <Ionicons name="swap-horizontal-outline" size={13} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyPrivacyFeatureText}>Routed via Privacy Pool</Text>
            </View>
            <View style={styles.emptyPrivacyFeature}>
              <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyPrivacyFeatureText}>Encrypted balance on-chain (Arcium)</Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
      </View>
    );
  }

  const getLabel = (tx: typeof displayedTransactions[0]) => {
    return tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Transaction';
  };

  const transactionsList = (
    <>
      {displayedTransactions.map((tx, index) => (
        <TouchableOpacity
          key={`${tx.signature}-${index}`}
          style={styles.row}
          onPress={() => Linking.openURL(tx.signatureURL)}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={styles.avatar}>
            {tx.type === 'sent' ? (
              <SendIcon width={20} height={20} />
            ) : (
              <ReceivedIcon width={20} height={20} />
            )}
          </View>

          {/* Name + date */}
          <View style={styles.details}>
            <Text style={styles.name}>{getLabel(tx)}</Text>
            <Text style={styles.subtitle}>
              {tx.dateFormatted} · {tx.tokenSymbol}
            </Text>
          </View>

          {/* Amount */}
          <Text style={styles.amount}>
            {tx.type === 'received' ? '+' : '-'}${tx.amountUSD.toFixed(2)}
          </Text>
        </TouchableOpacity>
      ))}

    </>
  );

  if (isCompactMode) {
    return (
      <ScrollView
        style={[styles.compactContainer, scrollable && { maxHeight: 200 }, style]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
          />
        }
      >
        {transactionsList}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
          />
        }
      >
        {transactionsList}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactContainer: {
    flex: 1,
  },
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
    marginLeft: 12,
  },
  loadingText: {
    color: '#FFFFFF',
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
  emptyPrivacyContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  emptyPrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyPrivacyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Sansation-Regular',
  },
  emptyPrivacyFeatures: {
    gap: 8,
    paddingLeft: 2,
  },
  emptyPrivacyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyPrivacyFeatureText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.22)',
    fontFamily: 'Sansation-Regular',
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
  viewAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewAllText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
});