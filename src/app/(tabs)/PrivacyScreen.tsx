import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import WalletSetupScreen, { WalletSetupChoice } from '../(auth)/WalletSetupScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupWallet } from '../../hooks/wallet/useInitPrivateWallet';
import { useAuthenticatedApi } from '../../services/api/clientStealf';
import { socketService } from '../../services/real-time/socketService';
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
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const { userData, setUserData } = useAuth();
  const setupWallet = useSetupWallet();
  const api = useAuthenticatedApi();

  const hasPrivacyWallet = !!userData?.stealf_wallet;

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

  useEffect(() => {
    if (currentPage === 'privacy') {
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      slideUpAnim.setValue(100);
    }
  }, [currentPage]);

  if (!hasPrivacyWallet) {
    return (
      <WalletSetupScreen
        onComplete={handleWalletSetup}
        loading={setupWallet.loading}
        generatedMnemonic={generatedMnemonic}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{
          transform: [{ translateY: slideUpAnim }],
          opacity: slideUpAnim.interpolate({
            inputRange: [0, 100],
            outputRange: [1, 0],
          }),
        }}
      >
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

        <View style={styles.activityContainer}>
          <Text style={styles.activityTitle}>Transactions</Text>
          <TransactionHistory limit={50} walletType="privacy" />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    height: 110,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  activityContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
    fontFamily: 'Sansation-Bold',
  },
});
