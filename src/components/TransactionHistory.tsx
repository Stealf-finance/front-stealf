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
  Alert,
} from 'react-native';
import { useWalletInfos } from '../hooks/useWalletInfos';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface TransactionHistoryProps {
  limit?: number;
  style?: any;
  walletType?: 'cash' | 'privacy';
}

export default function TransactionHistory({
  limit = 3,
  style,
  walletType = 'cash'
} : TransactionHistoryProps) {

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
  }


  const isCompactMode = limit <= 3;

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
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
      </View>
    );
  }

const transactionsList = (
    <>
      {displayedTransactions.map((tx, index) => (
        <TouchableOpacity
          key={`${tx.signature}-${index}`}
          style={[
            styles.transactionCard,
            isCompactMode && { marginBottom: index === displayedTransactions.length - 1 ? 0 : 12 }
          ]}
          onPress={() => Linking.openURL(tx.signatureURL)}
          activeOpacity={0.7}
        >
          <View style={styles.transactionIcon}>
            <Text style={styles.iconText}>
              {tx.type === 'sent' ? '↗' : tx.type === 'received' ? '↙' : '•'}
            </Text>
          </View>

          <View style={styles.transactionDetails}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionType}>
                {tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Transaction'}
              </Text>
              <Text style={[
                styles.transactionAmount,
                tx.type === 'sent' ? styles.amountSent : styles.amountReceived
              ]}>
                {tx.type === 'sent' ? '-' : tx.type === 'received' ? '+' : ''}
                ${tx.amountUSD.toFixed(2)}
              </Text>
            </View>

            <View style={styles.transactionFooter}>
              <Text style={styles.transactionDate}>{tx.dateFormatted}</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusDot,
                  tx.status === 'confirmed' && styles.statusConfirmed,
                  tx.status === 'finalized' && styles.statusConfirmed,
                  tx.status === 'success' && styles.statusConfirmed,
                ]} />
                <Text style={[
                  styles.statusText,
                  styles.statusTextConfirmed,
                ]}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.arrowContainer}>
            <Text style={styles.arrowIcon}>›</Text>
          </View>
        </TouchableOpacity>
      ))}

      {!isCompactMode && displayedTransactions.length > 0 && (
        <TouchableOpacity style={styles.viewAllButton} onPress={handleRefresh}>
          <Text style={styles.viewAllText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (isCompactMode) {
    return (
      <View style={[styles.compactContainer, style]}>
        {transactionsList}
      </View>
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
    // Pas de flex: 1 pour ne pas prendre tout l'espace
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
    color: 'white',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  transactionType: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  amountSent: {
    color: 'white',
  },
  amountReceived: {
    color: 'white',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusConfirmed: {
    backgroundColor: 'rgba(76, 217, 100, 0.8)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextConfirmed: {
    color: 'rgba(76, 217, 100, 0.9)',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  arrowIcon: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 24,
    fontWeight: '300',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
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
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
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
  },
});

