import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { BalanceDisplayProps } from '../../types';
import { useWallet, useBalance, usePrivateBalance } from '../../hooks';
import { authStorage } from '../../services/authStorage';

export default function BalanceDisplay({ isPrivacy = false, style }: BalanceDisplayProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { walletAddress } = useWallet();
  const { balance, loading, error, refresh } = useBalance(walletAddress);
  const { balances: privateBalances, totalBalance: privateTotalBalance, loading: privateLoading, refresh: refreshPrivate } = usePrivateBalance(userId);

  // Debug logs
  useEffect(() => {
    console.log('🔍 BalanceDisplay - walletAddress:', walletAddress);
    console.log('🔍 BalanceDisplay - balance:', balance);
    console.log('🔍 BalanceDisplay - loading:', loading);
    console.log('🔍 BalanceDisplay - error:', error);
  }, [walletAddress, balance, loading, error]);

  // Load user ID from JWT for private balances
  useEffect(() => {
    if (isPrivacy) {
      loadUserId();
    }
  }, [isPrivacy]);

  const loadUserId = async () => {
    try {
      const token = await authStorage.getAccessToken();
      if (token) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          setUserId(payload.sub || payload.user_id || payload.id);
        }
      }
    } catch (e) {
      console.error('Error loading user ID:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isPrivacy) {
      await refreshPrivate();
    } else {
      await refresh();
    }
    setRefreshing(false);
  };

  const toggleReveal = () => {
    setRevealed(!revealed);
  };

  // Calculer le total en USD (estimation simplifiée)
  const calculateTotalUSD = () => {
    if (!balance) return 0;

    let total = 0;

    // SOL à ~$20 (prix approximatif, à remplacer par un vrai price feed)
    total += balance.sol * 20;

    // Tokens
    balance.tokens.forEach((token) => {
      if (token.symbol === 'USDC' || token.symbol === 'USDT') {
        // Stablecoins = 1:1 USD
        total += token.uiAmount;
      } else if (token.symbol === 'SOL') {
        total += token.uiAmount * 20;
      }
      // Ajouter d'autres tokens ici si besoin
    });

    return total;
  };

  // Trouver le solde USDC
  const getUSDCBalance = () => {
    if (!balance) return 0;
    const usdc = balance.tokens.find(t => t.symbol === 'USDC');
    return usdc ? usdc.uiAmount : 0;
  };

  // Trouver le solde USDT
  const getUSDTBalance = () => {
    if (!balance) return 0;
    const usdt = balance.tokens.find(t => t.symbol === 'USDT');
    return usdt ? usdt.uiAmount : 0;
  };

  // Ne montrer le loader que si on n'a pas encore de balance
  if (loading && !balance) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="rgba(0, 0, 0, 0.3)" />
        <Text style={styles.loadingText}>Loading balance...</Text>
      </View>
    );
  }

  if (error && !balance) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>⚠️ {error.message}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!balance) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>No balance data</Text>
      </View>
    );
  }

  const totalUSD = calculateTotalUSD();
  const usdcBalance = getUSDCBalance();
  const usdtBalance = getUSDTBalance();

  return (
    <View style={[styles.container, style]}>
      {isPrivacy ? (
        // Mode Privacy - Afficher les balances réelles
        privateLoading && privateBalances.length === 0 ? (
          <View style={styles.balanceContainer}>
            <ActivityIndicator size="small" color="rgba(0, 0, 0, 0.5)" />
            <Text style={[styles.loadingText, { color: 'rgba(0, 0, 0, 0.6)' }]}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.balanceContainer}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: 'rgba(0, 0, 0, 0.6)' }]}>PRIVACY CASH</Text>
              <TouchableOpacity onPress={toggleReveal}>
                <Text style={[styles.balanceAmount, { color: 'rgba(0, 0, 0, 0.9)' }]}>
                  {revealed ? `${privateTotalBalance.toFixed(4)} SOL` : '*** SOL'}
                </Text>
              </TouchableOpacity>
            </View>

            {revealed && (
              <View style={styles.tokensContainer}>
                {privateBalances.map((wallet) => (
                  <View key={wallet.walletId} style={[styles.tokenRow, { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}>
                    <Text style={[styles.tokenSymbol, { color: 'rgba(0, 0, 0, 0.7)' }]}>{wallet.walletName}</Text>
                    <Text style={[styles.tokenAmount, { color: 'rgba(0, 0, 0, 0.9)' }]}>
                      {wallet.balance.toFixed(4)} SOL
                    </Text>
                  </View>
                ))}
                {privateBalances.length === 0 && (
                  <Text style={[styles.emptyText, { color: 'rgba(0, 0, 0, 0.4)' }]}>No private funds yet</Text>
                )}
              </View>
            )}

            <TouchableOpacity onPress={toggleReveal}>
              <Text style={[styles.balanceHint, { color: 'rgba(0, 0, 0, 0.5)' }]}>
                {revealed ? 'Tap to hide' : 'Tap to reveal'}
              </Text>
            </TouchableOpacity>

            {refreshing && (
              <ActivityIndicator size="small" color="rgba(0, 0, 0, 0.5)" style={styles.refreshIndicator} />
            )}
          </View>
        )
      ) : (
        // Mode Normal - Afficher le solde (texte blanc pour fond glassmorphic)
        <View style={styles.balanceContainer}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>TOTAL BALANCE</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={[styles.balanceAmount, { color: 'rgba(255, 255, 255, 0.95)' }]}>
                ${totalUSD.toFixed(2)} USD
              </Text>
            </TouchableOpacity>
          </View>

          {/* Détails par token */}
          <View style={styles.tokensContainer}>
            {balance.sol > 0 && (
              <View style={[styles.tokenRow, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Text style={[styles.tokenSymbol, { color: 'rgba(255, 255, 255, 0.8)' }]}>SOL</Text>
                <Text style={[styles.tokenAmount, { color: 'rgba(255, 255, 255, 0.95)' }]}>{balance.sol.toFixed(4)}</Text>
              </View>
            )}

            {usdcBalance > 0 && (
              <View style={[styles.tokenRow, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Text style={[styles.tokenSymbol, { color: 'rgba(255, 255, 255, 0.8)' }]}>USDC</Text>
                <Text style={[styles.tokenAmount, { color: 'rgba(255, 255, 255, 0.95)' }]}>{usdcBalance.toFixed(2)}</Text>
              </View>
            )}

            {usdtBalance > 0 && (
              <View style={[styles.tokenRow, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Text style={[styles.tokenSymbol, { color: 'rgba(255, 255, 255, 0.8)' }]}>USDT</Text>
                <Text style={[styles.tokenAmount, { color: 'rgba(255, 255, 255, 0.95)' }]}>{usdtBalance.toFixed(2)}</Text>
              </View>
            )}

            {balance.tokens.length === 0 && balance.sol === 0 && (
              <Text style={[styles.emptyText, { color: 'rgba(255, 255, 255, 0.5)' }]}>No funds yet</Text>
            )}
          </View>

          {refreshing && (
            <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.7)" style={styles.refreshIndicator} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  tokensContainer: {
    marginTop: 15,
    width: '100%',
    paddingHorizontal: 20,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    marginBottom: 8,
  },
  tokenSymbol: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenAmount: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshIndicator: {
    marginTop: 10,
  },
});
