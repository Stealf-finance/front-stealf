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
import { PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '../hooks';
import { solanaService } from '../services/solanaService';

// Cache des transactions (5 secondes pour éviter le rate limiting)
const CACHE_DURATION = 5 * 1000; // 5 secondes en ms
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
}

export default function TransactionHistory({ limit = 10, style }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utiliser le même hook que BalanceDisplay pour cohérence
  const { walletAddress } = useWallet();

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();

      // Refresh automatiquement toutes les 5 secondes
      const interval = setInterval(() => {
        fetchTransactions(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  const fetchTransactions = async (silent = false, forceRefresh = false) => {
    try {
      if (!silent) {
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

            // Si le cache a moins de 1 seconde, l'utiliser
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

      // Utiliser le même service que BalanceDisplay (avec Helius RPC)
      const connection = await solanaService.getConnection();
      const pubkey = new PublicKey(walletAddress);

      // Récupérer les signatures de transactions
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

      // Récupérer les détails de chaque transaction
      // IMPORTANT: Ajouter un délai entre chaque requête pour éviter le rate limiting
      const txs: Transaction[] = [];

      for (let i = 0; i < signatures.length; i++) {
        const sigInfo = signatures[i];

        try {
          // Délai de 100ms entre chaque transaction (Helius RPC plus rapide)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (tx) {
            const parsed = parseTransaction(tx, walletAddress);
            if (parsed) {
              txs.push(parsed);
            }
          }
        } catch (txErr: any) {
          // Si rate limit (429), on arrête et on affiche ce qu'on a
          if (txErr.message?.includes('429')) {
            console.warn(`⚠️ Rate limit hit at transaction ${i + 1}. Showing ${txs.length} transactions.`);
            break;
          }
          console.warn(`⚠️ Failed to parse transaction ${sigInfo.signature}:`, txErr);
        }
      }

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
      console.error('❌ Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const parseTransaction = (tx: ParsedTransactionWithMeta, userAddr: string): Transaction | null => {
    try {
      // Extraire la signature
      const signature = tx.transaction.signatures[0];

      // Timestamp (blockTime est en secondes, on convertit en millisecondes)
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();

      // Status
      const status = tx.meta?.err ? 'failed' : 'confirmed';

      // Analyser les instructions pour trouver les transfers
      const instructions = tx.transaction.message.instructions;

      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.parsed) {
          const parsed = instruction.parsed;

          // Transfer SOL (System Program)
          if (parsed.type === 'transfer' && instruction.program === 'system') {
            const info = parsed.info;
            const from = info.source;
            const to = info.destination;
            const amount = info.lamports / 1e9; // Convertir lamports en SOL

            const type = from === userAddr ? 'send' : 'receive';

            // Détecter si c'est une transaction privée (vers un PDA inconnu, pas une adresse normale)
            // Les PDAs Arcium ont généralement des adresses qui ne ressemblent pas à des wallets normaux
            const isPrivate = tx.transaction.message.accountKeys.length > 5; // Transaction complexe avec plusieurs comptes = probablement privée

            return {
              signature,
              type,
              amount,
              token: 'SOL',
              timestamp,
              status,
              from,
              to,
              isPrivate,
            };
          }

          // Transfer SPL Token (Token Program)
          if (
            (parsed.type === 'transfer' || parsed.type === 'transferChecked') &&
            (instruction.program === 'spl-token')
          ) {
            const info = parsed.info;

            // Pour transferChecked, on a tokenAmount directement
            // Pour transfer, on a amount en unités brutes
            let amount = 0;
            let tokenSymbol = 'TOKEN';

            if (parsed.type === 'transferChecked' && info.tokenAmount) {
              amount = parseFloat(info.tokenAmount.uiAmountString || '0');
            } else if (info.amount) {
              // Fallback: on assume 6 decimals pour USDC/USDT
              amount = parseInt(info.amount) / 1e6;
            }

            // Récupérer les adresses source et destination
            const sourceOwner = info.authority || info.source;
            const destOwner = info.destination;

            // Déterminer le type de transaction
            const type = sourceOwner === userAddr ? 'send' : 'receive';

            // Essayer de déterminer le symbole du token (USDC, USDT, etc.)
            // On pourrait enrichir cela avec un mapping mint -> symbol
            if (info.mint) {
              // USDC devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
              if (info.mint === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') {
                tokenSymbol = 'USDC';
              }
              // Ajouter d'autres mints connus ici
            }

            return {
              signature,
              type,
              amount,
              token: tokenSymbol,
              timestamp,
              status,
              from: sourceOwner,
              to: destOwner,
            };
          }
        }
      }

      // Si aucune instruction de transfer n'est trouvée, on retourne null
      return null;

    } catch (err) {
      console.warn('⚠️ Error parsing transaction:', err);
      return null;
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
