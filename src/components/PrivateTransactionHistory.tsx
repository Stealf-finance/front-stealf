import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, PublicKey, ParsedTransactionWithMeta, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { authStorage } from '../services/authStorage';
import { SOLANA_CONFIG } from '../config/umbra';

// Cache des transactions (5 secondes pour éviter le rate limiting)
const CACHE_DURATION = 5 * 1000;
const CACHE_KEY = 'private_transactions_cache_';

interface PrivateTransaction {
  type: 'send' | 'receive';
  amount: number;
  signature: string;
  timestamp?: number;
  to?: string;
  from?: string;
}

interface PrivateTransactionHistoryProps {
  limit?: number;
  style?: any;
}

export default function PrivateTransactionHistory({ limit = 10, style }: PrivateTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<PrivateTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();

    // Refresh automatiquement toutes les 5 secondes
    const interval = setInterval(() => {
      fetchTransactions(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async (silent = false, forceRefresh = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Get private wallet address from storage
      const privateWalletAddress = await authStorage.getPrivateWalletAddress();

      if (!privateWalletAddress) {
        console.log('[PrivateTransactionHistory] No private wallet address found');
        setTransactions([]);
        setLoading(false);
        return;
      }

      console.log('[PrivateTransactionHistory] Fetching transactions for private wallet:', privateWalletAddress);

      // Check cache first
      if (!forceRefresh) {
        const cacheKey = `${CACHE_KEY}${privateWalletAddress}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
          try {
            const { transactions: cachedTxs, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < CACHE_DURATION) {
              console.log('[PrivateTransactionHistory] Using cached transactions');
              setTransactions(cachedTxs.slice(0, limit));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cache:', e);
          }
        }
      }

      // Fetch on-chain transactions from Solana RPC
      const connection = new Connection(SOLANA_CONFIG.RPC_URL, 'confirmed');
      const publicKey = new PublicKey(privateWalletAddress);

      // Fetch confirmed signatures for this address
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: limit * 2,
      });

      console.log(`[PrivateTransactionHistory] Found ${signatures.length} signatures`);

      // Fetch transaction details for each signature
      const txPromises = signatures.map(sig =>
        connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      );

      const parsedTxs = await Promise.all(txPromises);

      // Transform Solana transactions to our PrivateTransaction type
      const txs: PrivateTransaction[] = parsedTxs
        .filter((tx): tx is ParsedTransactionWithMeta => tx !== null)
        .map((tx, index) => {
          const signature = signatures[index].signature;
          const blockTime = tx.blockTime || 0;
          const timestamp = blockTime * 1000;

          // Find transfers involving our wallet
          const preBalance = tx.meta?.preBalances?.[0] || 0;
          const postBalance = tx.meta?.postBalances?.[0] || 0;
          const balanceChange = postBalance - preBalance;

          // Determine type (send or receive) based on balance change
          const type: 'send' | 'receive' = balanceChange < 0 ? 'send' : 'receive';

          // Calculate amount (in lamports for compatibility with existing code)
          const amount = Math.abs(balanceChange);

          // Try to find the other party's address
          let otherAddress: string | undefined;
          if (tx.transaction.message.accountKeys.length > 1) {
            otherAddress = tx.transaction.message.accountKeys
              .find(key => key.pubkey.toBase58() !== privateWalletAddress)?.pubkey.toBase58();
          }

          return {
            signature,
            type,
            amount,
            timestamp,
            from: type === 'send' ? privateWalletAddress : otherAddress,
            to: type === 'send' ? otherAddress : privateWalletAddress,
          };
        })
        .filter(tx => tx.amount > 0)
        .slice(0, limit);

      console.log(`[PrivateTransactionHistory] Processed ${txs.length} transactions`);

      setTransactions(txs);

      // Save to cache
      if (txs.length > 0 && privateWalletAddress) {
        const cacheKey = `${CACHE_KEY}${privateWalletAddress}`;
        const cacheData = {
          transactions: txs,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }

    } catch (err: any) {
      console.error('❌ Error fetching private transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions(false, true);
  };

  const openExplorer = (signature: string) => {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    Linking.openURL(explorerUrl).catch(() => {
      Alert.alert('Error', 'Could not open Solana Explorer');
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recently';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amountLamports: number) => {
    return (amountLamports / 1e9).toFixed(4);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    // For private transactions, we mask the address to show it's a stealth address
    if (address === 'Private') return 'Private Address';
    // Show stealth address indicator
    return `🔒 ${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>No private transactions yet</Text>
          <Text style={styles.emptySubtext}>Your private transaction history will appear here</Text>
        </View>
      </View>
    );
  }

  const isCompactMode = limit <= 3;

  const transactionsList = (
    <>
      {transactions.map((tx, index) => (
        <TouchableOpacity
          key={`${tx.signature}-${index}`}
          style={[
            styles.transactionCard,
            isCompactMode && { marginBottom: index === transactions.length - 1 ? 0 : 12 }
          ]}
          onPress={() => openExplorer(tx.signature)}
          activeOpacity={0.7}
        >
          <View style={styles.transactionIcon}>
            <Text style={styles.iconText}>
              {tx.type === 'send' ? '↗' : '↙'}
            </Text>
          </View>

          <View style={styles.transactionDetails}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionType}>
                {tx.type === 'send' ? '🔒 Private Send' : '🔒 Private Receive'}
                {tx.type === 'send' && tx.to ? ` → ${formatAddress(tx.to)}` : ''}
                {tx.type === 'receive' && tx.from ? ` ← ${formatAddress(tx.from)}` : ''}
              </Text>
              <Text style={[
                styles.transactionAmount,
                tx.type === 'send' ? styles.amountSent : styles.amountReceived
              ]}>
                {tx.type === 'send' ? '-' : '+'}
                {formatAmount(tx.amount)} SOL
              </Text>
            </View>

            <View style={styles.transactionFooter}>
              <Text style={styles.transactionDate}>{formatDate(tx.timestamp)}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, styles.statusConfirmed]} />
                <Text style={[styles.statusText, styles.statusTextConfirmed]}>
                  Arcium MPC
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.arrowContainer}>
            <Text style={styles.arrowIcon}>›</Text>
          </View>
        </TouchableOpacity>
      ))}

      {!isCompactMode && transactions.length > 0 && (
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
  compactContainer: {},
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
  },
  statusConfirmed: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextConfirmed: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: 'white',
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
