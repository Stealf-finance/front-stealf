import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import AddFundsPrivacyModal from '../../components/AddFundsPrivacyModal';
import WalletSetupScreen, { WalletSetupChoice } from '../(auth)/WalletSetupScreen';
import { useYieldDashboard } from '../../hooks/yield/useYield';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupWallet } from '../../hooks/wallet/useInitPrivateWallet';
import type { PageType } from '../../navigation/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenMoove: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenDepositPrivateCash: () => void;
  onOpenProfile: () => void;
  onOpenInfo: () => void;
  userEmail?: string;
  currentPage?: PageType;
}

export default function PrivacyScreen({
  onNavigateToPage,
  onOpenMoove,
  onOpenAddFundsPrivacy,
  onOpenDepositPrivateCash,
  onOpenInfo,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const { data: dashboard } = useYieldDashboard();
  const { userData, setUserData } = useAuth();
  const setupWallet = useSetupWallet();

  const hasPrivacyWallet = !!userData?.stealf_wallet;

  const handleWalletSetup = async (choice: WalletSetupChoice) => {
    if (choice.mode === 'create') {
      // Second call = user confirmed mnemonic
      if (generatedMnemonic && pendingWalletAddress) {
        await registerPrivacyWallet(pendingWalletAddress);
        setGeneratedMnemonic(undefined);
        setPendingWalletAddress(null);
        return;
      }
      // First call = create wallet, show mnemonic
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
    // Update userData locally
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
              onTopUp={handleAddFundsPress}
              onExchange={onOpenMoove}
              onMore={onOpenInfo}
            />
          </View>

          {/* Savings shortcut */}
          <Animated.View
            style={[
              styles.savingsCardWrapper,
              {
                transform: [{ translateY: slideUpAnim }],
                opacity: slideUpAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0],
                }),
              }
            ]}
          >
            <TouchableOpacity
              style={styles.savingsCard}
              onPress={() => onNavigateToPage('savings')}
              activeOpacity={0.75}
            >
              <View style={styles.savingsCardLeft}>
                <View style={styles.savingsCardIcon}>
                  <Ionicons name="trending-up" size={18} color="#4ADE80" />
                </View>
                <View>
                  <Text style={styles.savingsCardTitle}>Savings</Text>
                  <Text style={styles.savingsCardSub}>
                    {dashboard?.balance?.currentValue != null && dashboard.balance.currentValue > 0
                      ? `${dashboard.balance.currentValue.toFixed(4)} SOL staked`
                      : 'No active deposit'}
                  </Text>
                </View>
              </View>
              <View style={styles.savingsCardRight}>
                <Text style={styles.savingsCardCta}>View</Text>
                <Ionicons name="chevron-forward" size={14} color="#4ADE80" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Recent Activity */}
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

          {/* Add Funds Modal */}
          <AddFundsPrivacyModal
            visible={showAddFundsModal}
            onClose={() => setShowAddFundsModal(false)}
            onSelectPrivateCash={handleSelectPrivateCash}
            onSelectSimpleDeposit={handleSelectSimpleDeposit}
          />
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
  savingsCardWrapper: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74,222,128,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  savingsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74,222,128,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsCardTitle: {
    fontSize: 15,
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  savingsCardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Sansation-Regular',
    marginTop: 2,
  },
  savingsCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  savingsCardCta: {
    fontSize: 13,
    color: '#4ADE80',
    fontFamily: 'Sansation-Regular',
  },
});
