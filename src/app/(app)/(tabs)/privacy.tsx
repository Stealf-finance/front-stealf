import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletSetupScreen, { WalletSetupChoice } from '../../../components/WalletSetup';
import ChevronRight from '../../../assets/buttons/chevron-right.svg';
import ChevronRightBlack from '../../../assets/buttons/chevron-right-black-24px.svg';
import TransactionHistory from '../../../components/TransactionHistory';
import { useAuth } from '../../../contexts/AuthContext';
import { useSetupWallet } from '../../../hooks/wallet/useInitPrivateWallet';
import { useAuthenticatedApi } from '../../../hooks/api/useApi';
import { BalanceResponseSchema, HistoryResponseSchema } from '../../../services/api/schemas';
import { useWalletInfos } from '../../../hooks/wallet/useWalletInfos';
import { useShieldedBalance } from '../../../hooks/wallet/useShieldedBalance';
import { usePendingClaims } from '../../../hooks/wallet/usePendingClaims';
import { socketService } from '../../../services/real-time/socketService';
import { useQueryClient } from '@tanstack/react-query';
import { usePager } from '../../../navigation/PagerContext';
import { useSplash } from '../../../contexts/SplashContext';
import { useSolPrice } from '../../../hooks/useSolPrice';
import { usePreloadZKeysOnMount } from '../../../zk';
import { useMWAAvailability } from '../../../hooks/useMWAAvailability';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { setStealfWalletType } from '../../../services/wallet/stealfWalletType';

export default function PrivacyScreen() {
  const router = useRouter();
  usePager();
  // Preload Umbra ZK circuits in background — only loaded when user first
  // visits the Privacy tab (was firing at app boot before, slowing down cold start).
  usePreloadZKeysOnMount();
  const { showSplash } = useSplash();
  const insets = useSafeAreaInsets();
  const { userData, setUserData } = useAuth();
  const setupWallet = useSetupWallet();
  const api = useAuthenticatedApi();
  const { isMWAAvailable } = useMWAAvailability();
  const walletAuth = useWalletAuth();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData?.stealf_wallet] }),
      queryClient.invalidateQueries({ queryKey: ['wallet-history', userData?.stealf_wallet] }),
      queryClient.invalidateQueries({ queryKey: ['shielded-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-claims'] }),
    ]);
    setRefreshing(false);
  }, [queryClient, userData?.stealf_wallet]);

  const hasPrivacyWallet = !!userData?.stealf_wallet;
  const { balance, tokens } = useWalletInfos(userData?.stealf_wallet || '');
  const { data: solPriceData } = useSolPrice();
  const solPrice = solPriceData ?? 0;

  const { data: shielded } = useShieldedBalance();
  const shieldedBalance = (shielded?.sol ?? 0) * solPrice;
  const walletBalance = balance ?? 0;
  const totalBalance = walletBalance + shieldedBalance;

  const { data: pendingClaims } = usePendingClaims();
  const pendingCount = pendingClaims?.length ?? 0;

  // Wallet setup state
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

  const handleWalletSetup = async (choice: WalletSetupChoice) => {
    if (choice.mode === 'create') {
      if (generatedMnemonic && pendingWalletAddress) {
        await registerPrivacyWallet(pendingWalletAddress);
        await setStealfWalletType('local');
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
      await setStealfWalletType('local');
    }

    if (choice.mode === 'mwa') {
      const result = await walletAuth.connectWallet();
      if (!result.success) {
        if (result.error) Alert.alert('Error', result.error);
        return;
      }
      if (!result.address) {
        Alert.alert('Error', 'Failed to get Seeker wallet address');
        return;
      }
      await registerPrivacyWallet(result.address);
      await setStealfWalletType('mwa');
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

    queryClient.prefetchQuery({
      queryKey: ['wallet-balance', walletAddress],
      queryFn: async () => BalanceResponseSchema.parse(await api.get(`/api/wallet/balance/${walletAddress}`)),
      staleTime: Infinity,
    });
    queryClient.prefetchQuery({
      queryKey: ['wallet-history', walletAddress],
      queryFn: async () => HistoryResponseSchema.parse(await api.get(`/api/wallet/history/${walletAddress}?limit=10`)),
      staleTime: Infinity,
    });

    showSplash();
    if (userData) {
      setUserData({ ...userData, stealf_wallet: walletAddress });
    }
  };

  if (!hasPrivacyWallet) {
    return (
      <WalletSetupScreen
        onComplete={handleWalletSetup}
        onCancel={() => { setGeneratedMnemonic(undefined); setPendingWalletAddress(null); }}
        loading={setupWallet.loading || walletAuth.loading}
        generatedMnemonic={generatedMnemonic}
        mwaAvailable={isMWAAvailable}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f1ece1" progressViewOffset={100} />}
      >
        {/* Spacer — same as home screen */}
        <View style={{ height: insets.top + 60 }} />

        {/* Total Balance — matches home CashBalanceCard layout */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20, marginBottom: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 4 }}>
            Available
          </Text>
          <Text style={{ color: '#f1ece1', fontSize: 48, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'] }}>
            ${totalBalance.toFixed(2)}
          </Text>
        </View>

        {/* Categories */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 28 }}>

          {/* Wallet (public) — white card */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/wallet-detail')}
            activeOpacity={0.7}
            delayPressIn={100}
            accessibilityRole="button"
            accessibilityLabel="View wallet details"
            style={{
              backgroundColor: '#f1ece1',
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 28,
              paddingHorizontal: 22,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#000100', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 10 }}>Public</Text>
              <Text style={{ color: '#000100', fontSize: 28, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 6 }}>
                ${walletBalance.toFixed(2)}
              </Text>
              <Text style={{ color: 'rgba(0,1,0,0.5)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Send, receive & manage your assets</Text>
            </View>
            <ChevronRightBlack width={24} height={24} style={{ marginLeft: 12, opacity: 0.8 }} />
          </TouchableOpacity>

          {/* Shielded (protected assets + investments) — gray card */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/shielded-detail')}
            activeOpacity={0.7}
            delayPressIn={100}
            accessibilityRole="button"
            accessibilityLabel={`View shielded assets and investments${pendingCount > 0 ? `, ${pendingCount} pending claims` : ''}`}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 28,
              paddingHorizontal: 22,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f1ece1', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 10 }}>Private</Text>
              <Text style={{ color: '#f1ece1', fontSize: 28, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 6 }}>
                ${shieldedBalance.toFixed(2)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Protected assets & private investments</Text>
            </View>
            <ChevronRight width={24} height={24} style={{ marginLeft: 12, opacity: 0.8 }} />
            {pendingCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  minWidth: 22,
                  height: 22,
                  paddingHorizontal: 6,
                  borderRadius: 11,
                  backgroundColor: '#ff3b30',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#f1ece1', fontSize: 12, fontFamily: 'Sansation-Bold', lineHeight: 14 }}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#f1ece1', fontSize: 18, fontFamily: 'Sansation-Bold' }}>
              Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/transaction-history?walletType=privacy')}
              accessibilityRole="button"
              accessibilityLabel="See all transactions"
            >
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Sansation-Regular' }}>
                See all
              </Text>
            </TouchableOpacity>
          </View>
          <TransactionHistory limit={3} walletType="privacy" />
        </View>
      </ScrollView>
    </View>
  );
}
