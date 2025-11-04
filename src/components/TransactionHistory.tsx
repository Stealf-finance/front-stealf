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
import { useWallet } from '../hooks';
import { authStorage } from '../services/authStorage';
import { getGridClient } from '../config/grid';


const CACHE_DURATION = 5 * 1000;
const CACHE_KEY = 'transactions_cache_';

interface Transaction {
  signature: string;
  type: 'send' | 'receive' | 'unknown';
  amount: number;
  token: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  from?: string;
  to?: string;
  isPrivate?: boolean;
}

interface TransactionHistoryProps {
  limit?: number;
  style?: any;
  isDemo?: boolean;
}

export default function TransactionHistory({ limit = 10, style, isDemo = false }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

 
  const { walletAddress } = useWallet();

  useEffect(() => {
    // Si mode demo, afficher des transactions hardcodées
    if (isDemo) {
      const demoTransactions: Transaction[] = [
        {
          signature: 'demo-tx-1',
          type: 'receive',
          amount: 150.00,
          token: 'USD',
          timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
          status: 'confirmed',
          from: '7xK...9pQ2',
          isPrivate: false,
        },
        {
          signature: 'demo-tx-2',
          type: 'send',
          amount: 45.50,
          token: 'USD',
          timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1d ago
          status: 'confirmed',
          to: '3mF...8kL1',
          isPrivate: false,
        },
      ];
      setTransactions(demoTransactions);
      setLoading(false);
      return;
    }

    if (walletAddress) {
      fetchTransactions();

      // Refresh automatiquement toutes les 5 secondes
      const interval = setInterval(() => {
        fetchTransactions(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [walletAddress, isDemo]);

  const fetchTransactions = async (silent = true, forceRefresh = false) => {
    try {
      // Ne plus jamais afficher le loading pour éviter les clignotements
      // Le loading initial reste visible seulement si pas de transactions
      if (transactions.length === 0 && !silent) {
        setLoading(true);
      }
      setError(null);

      if (!walletAddress) {
        setError('No wallet found');
        setLoading(false);
        return;
      }

      // Vérifier le cache si pas de forceRefresh
      if (!forceRefresh) {
        const cacheKey = `${CACHE_KEY}${walletAddress}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);

        if (cachedData) {
          try {
            const { transactions: cachedTxs, timestamp } = JSON.parse(cachedData);
            const age = Date.now() - timestamp;

            // Si le cache a moins de 5 secondes, l'utiliser
            if (age < CACHE_DURATION) {
              // Limiter le nombre de transactions selon la prop limit
              setTransactions(cachedTxs.slice(0, limit));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cache:', e);
          }
        }
      }

      // Use GRID SDK backend endpoint instead of direct RPC calls
      const gridClient = getGridClient();

      // Utiliser le SDK Grid pour récupérer les transactions
      const responseData = await gridClient.getTransfers(walletAddress);

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to fetch transactions');
      }

      // Extract data from response wrapper
      const data: any = responseData.data || [];

      // Check different possible structures
      let transfers: any[] = [];
      if (Array.isArray(data)) {
        transfers = data;
      } else if (typeof data === 'object' && data !== null) {
        if (data.transfers && Array.isArray(data.transfers)) {
          transfers = data.transfers;
        } else if (data.data && Array.isArray(data.data)) {
          transfers = data.data;
        }
      }

      // Transform GRID SDK response to match expected Transaction type
      const txs: Transaction[] = transfers
        .map((transfer: any) => {
          // GRID SDK wraps transfers in { "Spl": {...} } or { "Native": {...} }
          const txData = transfer.Spl || transfer.Native || transfer;

          // GRID SDK returns created_at without timezone, so add 'Z' to treat it as UTC
          const timestamp = txData.created_at ? new Date(txData.created_at + 'Z').getTime() :
                            (transfer.timestamp ? new Date(transfer.timestamp).getTime() : Date.now());

          const type: 'send' | 'receive' = (txData.direction === 'outflow' || transfer.type === 'outgoing') ? 'send' : 'receive';
          const status: 'confirmed' | 'pending' | 'failed' =
            txData.confirmation_status === 'confirmed' || transfer.status === 'confirmed' ? 'confirmed' :
            (txData.confirmation_status === 'failed' || transfer.status === 'failed' ? 'failed' : 'pending');

          return {
            signature: txData.signature || transfer.signature || transfer.txId || 'unknown',
            type,
            amount: parseFloat(txData.ui_amount || txData.amount || transfer.amount || '0'),
            token: txData.mint ? 'USDC' : (transfer.token || 'SOL'),
            timestamp,
            status,
            from: txData.from_address || transfer.from || transfer.sender,
            to: txData.to_address || transfer.to || transfer.recipient,
            isPrivate: transfer.isPrivate || false,
          };
        })
        .slice(0, limit); // Apply limit AFTER mapping to ensure we get diverse transactions

      setTransactions(txs);

      // Sauvegarder dans le cache
      if (txs.length > 0 && walletAddress) {
        const cacheKey = `${CACHE_KEY}${walletAddress}`;
        const cacheData = {
          transactions: txs,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }

    } catch (err: any) {
      console.error('❌ Error fetching transactions via GRID SDK:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleRefresh = () => {
    setRefreshing(true);
    // Force refresh pour ignorer le cache lors du pull-to-refresh
    fetchTransactions(false, true);
  };

  const openExplorer = (signature: string) => {
    // Mainnet = pas de cluster parameter
    const explorerUrl = `https://explorer.solana.com/tx/${signature}`;
    Linking.openURL(explorerUrl).catch(() => {
      Alert.alert('Error', 'Could not open Solana Explorer');
    });
  };

  const formatDate = (timestamp: number) => {
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

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Ne jamais afficher d'état de chargement, toujours afficher directement le contenu
  if (transactions.length === 0 && !loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
        </View>
      </View>
    );
  }

  // Si limit <= 3, on affiche sans ScrollView (pour HomeScreen)
  // Sinon on garde le ScrollView (pour page dédiée historique)
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
                  {tx.type === 'send' ? 'Sent' : 'Received'}
                  {tx.isPrivate
                    ? ' (Private)'
                    : (tx.type === 'send' && tx.to ? ` to ${formatAddress(tx.to)}` : '')
                  }
                  {!tx.isPrivate && tx.type === 'receive' && tx.from ? ` from ${formatAddress(tx.from)}` : ''}
                </Text>
                <Text style={[
                  styles.transactionAmount,
                  tx.type === 'send' ? styles.amountSent : styles.amountReceived
                ]}>
                  {tx.type === 'send' ? '-' : '+'}
                  {tx.amount.toFixed(4)} {tx.token}
                </Text>
              </View>

              <View style={styles.transactionFooter}>
                <Text style={styles.transactionDate}>{formatDate(tx.timestamp)}</Text>
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusDot,
                    tx.isPrivate && styles.statusPrivate,
                    !tx.isPrivate && tx.status === 'confirmed' && styles.statusConfirmed,
                    !tx.isPrivate && tx.status === 'pending' && styles.statusPending,
                    !tx.isPrivate && tx.status === 'failed' && styles.statusFailed,
                  ]} />
                  <Text style={[
                    styles.statusText,
                    tx.isPrivate && styles.statusTextPrivate,
                    !tx.isPrivate && tx.status === 'confirmed' && styles.statusTextConfirmed,
                    !tx.isPrivate && tx.status === 'pending' && styles.statusTextPending,
                    !tx.isPrivate && tx.status === 'failed' && styles.statusTextFailed,
                  ]}>
                    {tx.isPrivate ? 'Private' : (tx.status.charAt(0).toUpperCase() + tx.status.slice(1))}
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

  // Mode compact (HomeScreen) : pas de ScrollView, pas de flex
  if (isCompactMode) {
    return (
      <View style={[styles.compactContainer, style]}>
        {transactionsList}
      </View>
    );
  }

  // Mode complet : avec ScrollView et pull-to-refresh
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
  },
  statusConfirmed: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusFailed: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusPrivate: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextConfirmed: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusTextPending: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusTextFailed: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusTextPrivate: {
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
