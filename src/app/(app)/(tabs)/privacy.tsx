import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BalanceCardPrivacy from '../../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../../components/TransactionHistory';
import SegmentedControl from '../../../components/SegmentedControl';
import WalletSetupScreen, { WalletSetupChoice } from '../../../components/WalletSetup';
import { useAuth } from '../../../contexts/AuthContext';
import { useSetupWallet } from '../../../hooks/wallet/useInitPrivateWallet';
import { useAuthenticatedApi } from '../../../hooks/api/useApi';
import { socketService } from '../../../services/real-time/socketService';
import { usePager } from '../../../navigation/PagerContext';
import { useSplash } from '../../../contexts/SplashContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { currentPage, navigateToPage } = usePager();
  const { showSplash } = useSplash();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const slideUpAnim = useSharedValue(100);
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
    showSplash();
    if (userData) {
      setUserData({ ...userData, stealf_wallet: walletAddress });
    }
  };

  useEffect(() => {
    if (currentPage === 'privacy') {
      slideUpAnim.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      slideUpAnim.value = 100;
    }
  }, [currentPage]);

  const activityAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUpAnim.value }],
    opacity: 1 - slideUpAnim.value / 100,
  }));

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleSelectSimpleDeposit = () => {
    setShowAddFundsModal(false);
    router.push('/(app)/add-funds-privacy');
  };

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    router.push('/(app)/deposit-private');
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
    <View style={styles.container}>
      <View style={{ height: insets.top + 60 }} />
      <View style={styles.cardsContainer}>
        <BalanceCardPrivacy
          mode={activeTab === 0 ? 'public' : 'private'}
          onTopUp={() => router.push('/(app)/add-funds-privacy')}
          onWithdraw={() => router.push('/(app)/send?walletType=stealf')}
          onExchange={() => router.push('/(app)/moove?direction=toCash')}
          onMore={() => router.push('/(app)/info?source=privacy')}
          onGrow={() => router.push('/(app)/saving-dashboard')}
        />
      </View>

      {/* Recent Activity — public only */}
      {activeTab === 0 && (
        <Animated.View
          style={[
            styles.activityContainer,
            activityAnimatedStyle,
          ]}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Transactions</Text>
          </View>
          <TransactionHistory limit={50} walletType="privacy" />
        </Animated.View>
      )}



      {/* Segmented Control */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          tabs={['Public', 'Private']}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  cardsContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 5,
    position: 'relative',
  },
  activityContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  segmentedWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 80,
    paddingTop: 8,
    paddingBottom: 40,
  },
});
