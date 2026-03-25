import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import SegmentedControl from '../../components/SegmentedControl';
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
  onNavigateToPage,
  onOpenMoove,
  onOpenSend,
  onOpenAddFundsPrivacy,
  onOpenDepositPrivateCash,
  onOpenInfo,
  onOpenSavings,
  onShowLoader,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
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

  const handleAddFundsPress = () => {
    setShowAddFundsModal(true);
  };

  const handleSelectSimpleDeposit = () => {
    setShowAddFundsModal(false);
    onOpenAddFundsPrivacy();
  };

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    onOpenDepositPrivateCash();
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
      <View style={styles.headerSpacer} />
      <View style={styles.cardsContainer}>
        <BalanceCardPrivacy
          mode={activeTab === 0 ? 'public' : 'private'}
          onTopUp={onOpenAddFundsPrivacy}
          onWithdraw={onOpenSend}
          onExchange={onOpenMoove}
          onMore={onOpenInfo}
          onGrow={onOpenSavings}
        />
      </View>

      {/* Recent Activity — public only */}
      {activeTab === 0 && (
        <Animated.View
          style={[
            styles.activityContainer,
            {
              transform: [{ translateY: slideUpAnim }],
              opacity: slideUpAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
              }),
            }
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
  headerSpacer: {
    height: 110,
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
