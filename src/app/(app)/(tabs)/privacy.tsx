import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletSetupScreen, { WalletSetupChoice } from '../../../components/WalletSetup';
import ChevronRight from '../../../assets/buttons/chevron-right.svg';
import TransactionHistory from '../../../components/TransactionHistory';
import { useAuth } from '../../../contexts/AuthContext';
import { useSetupWallet } from '../../../hooks/wallet/useInitPrivateWallet';
import { useAuthenticatedApi } from '../../../hooks/api/useApi';
import { useWalletInfos } from '../../../hooks/wallet/useWalletInfos';
import { socketService } from '../../../services/real-time/socketService';
import { usePager } from '../../../navigation/PagerContext';
import { useSplash } from '../../../contexts/SplashContext';

export default function PrivacyScreen() {
  const router = useRouter();
  usePager(); // keep provider mounted
  const { showSplash } = useSplash();
  const insets = useSafeAreaInsets();
  const { userData, setUserData } = useAuth();
  const setupWallet = useSetupWallet();
  const api = useAuthenticatedApi();

  const hasPrivacyWallet = !!userData?.stealf_wallet;
  const { balance } = useWalletInfos(userData?.stealf_wallet || '');

  // TODO: hook into Umbra SDK for shielded balance (includes investments)
  const shieldedBalance = 0;
  const walletBalance = balance ?? 0;
  const totalBalance = walletBalance + shieldedBalance;

  // Wallet setup state
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

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
        loading={setupWallet.loading}
        generatedMnemonic={generatedMnemonic}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer — same as home screen */}
        <View style={{ height: insets.top + 60 }} />

        {/* Total Balance — matches home CashBalanceCard layout */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20, marginBottom: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 4 }}>
            Total Balance
          </Text>
          <Text style={{ color: '#fff', fontSize: 48, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'] }}>
            ${totalBalance.toFixed(2)}
          </Text>
        </View>

        {/* Categories */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 28 }}>

          {/* Wallet (public) */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/wallet-detail')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View wallet details"
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
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 10 }}>Visible</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 6 }}>
                ${walletBalance.toFixed(2)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Send, receive & manage your assets</Text>
            </View>
            <ChevronRight width={24} height={24} style={{ marginLeft: 12, opacity: 0.6 }} />
          </TouchableOpacity>

          {/* Shielded (protected assets + investments) */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/shielded-detail')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View shielded assets and investments"
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
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 10 }}>Private</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 6 }}>
                ${shieldedBalance.toFixed(2)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Protected assets & private investments</Text>
            </View>
            <ChevronRight width={24} height={24} style={{ marginLeft: 12, opacity: 0.6 }} />
          </TouchableOpacity>

        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold' }}>
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
