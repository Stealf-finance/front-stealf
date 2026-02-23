import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import BalanceCardPrivacy from '../../components/features/PrivacyBalanceCard';
import TransactionHistory from '../../components/TransactionHistory';
import AddFundsPrivacyModal from '../../components/AddFundsPrivacyModal';
import SendPrivacyModal from '../../components/SendPrivacyModal';
import StealthReceiveModal from '../../components/StealthReceiveModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';
import { usePrivacyBalance } from '../../hooks/usePrivacyBalance';
import { useStealthPayments } from '../../hooks/useStealthPayments';
import { useStealthAddress } from '../../hooks/useStealthAddress';
import { useStealthTransfer } from '../../hooks/useStealthTransfer';
import type { PageType } from '../../navigation/types';

interface PrivacyScreenProps {
  onNavigateToPage: (page: PageType) => void;
  onOpenSendPrivate: (transferType: 'basic' | 'private') => void;
  onOpenMoove: () => void;
  onOpenAddFundsPrivacy: () => void;
  onOpenDepositPrivateCash: () => void;
  onOpenProfile: () => void;
  onOpenInfo: () => void;
  userEmail?: string;
  username?: string;
  currentPage?: PageType;
}

export default function PrivacyScreen({
  onNavigateToPage,
  onOpenSendPrivate,
  onOpenMoove,
  onOpenAddFundsPrivacy,
  onOpenInfo,
  username,
  currentPage = 'privacy',
}: PrivacyScreenProps) {
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSendPrivacyModal, setShowSendPrivacyModal] = useState(false);
  const [showStealthReceive, setShowStealthReceive] = useState(false);

  const { payments: stealthPayments, spendPayment } = useStealthPayments();
  const slideUpAnim = useRef(new Animated.Value(100)).current;

  const { userData } = useAuth();
  const { balance: basicBalance } = useWalletInfos(userData?.stealf_wallet || '');
  const { totalUSD: privacyBalance } = usePrivacyBalance();
  const { metaAddress: ownMetaAddress } = useStealthAddress();
  const { send: sendStealth } = useStealthTransfer();

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

  const handleSelectPrivateCash = () => {
    setShowAddFundsModal(false);
    if (!ownMetaAddress) {
      Alert.alert('Erreur', 'Adresse stealth non initialisée. Réessaie dans un instant.');
      return;
    }
    Alert.prompt(
      '🔒 Dépôt privé',
      'Montant en SOL à envoyer vers ton wallet privé :',
      async (amountStr) => {
        if (!amountStr || !userData?.cash_wallet) return;
        const amountSOL = parseFloat(amountStr);
        if (isNaN(amountSOL) || amountSOL <= 0) {
          Alert.alert('Erreur', 'Montant invalide');
          return;
        }
        const amountLamports = BigInt(Math.round(amountSOL * 1_000_000_000));
        const senderAddr = userData.stealf_wallet || userData.cash_wallet;
        const result = await sendStealth(ownMetaAddress, amountLamports, senderAddr);
        if (result) {
          Alert.alert('✅ Succès', `Dépôt stealth confirmé !\nTX: ${result.txSignature.slice(0, 20)}...`);
        } else {
          Alert.alert('Erreur', 'Le dépôt a échoué. Vérifie ton solde.');
        }
      },
      'plain-text',
      '',
      'numeric',
    );
  };

  const handleSelectSimpleDeposit = () => {
    setShowAddFundsModal(false);
    onOpenAddFundsPrivacy();
  };

  const handleSendPress = () => {
    setShowSendPrivacyModal(true);
  };

  const handleSelectBasicTransfer = () => {
    setShowSendPrivacyModal(false);
    onOpenSendPrivate('basic');
  };

  const handleSelectPrivateTransfer = () => {
    setShowSendPrivacyModal(false);
    onOpenSendPrivate('private');
  };

  return (
    <View style={styles.container}>
          {/* Header Spacer */}
          <View style={styles.headerSpacer} />

          {/* Balance Card */}
          <View style={styles.cardsContainer}>
            <BalanceCardPrivacy
              onWithdraw={handleSendPress}
              onTopUp={handleAddFundsPress}
              onExchange={onOpenMoove}
              onMore={onOpenInfo}
            />
          </View>

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
              <TouchableOpacity onPress={() => onNavigateToPage('transactionHistory')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <TransactionHistory limit={2} walletType="privacy" />
          </Animated.View>

          {/* Add Funds Modal */}
          <AddFundsPrivacyModal
            visible={showAddFundsModal}
            onClose={() => setShowAddFundsModal(false)}
            onSelectPrivateCash={handleSelectPrivateCash}
            onSelectSimpleDeposit={handleSelectSimpleDeposit}
          />

          {/* Send Privacy Modal */}
          <SendPrivacyModal
            visible={showSendPrivacyModal}
            onClose={() => setShowSendPrivacyModal(false)}
            onSelectBasicTransfer={handleSelectBasicTransfer}
            onSelectPrivateTransfer={handleSelectPrivateTransfer}
            username={username}
            basicTransferBalance={basicBalance || 0}
            privateTransferBalance={privacyBalance}
          />

          {/* Stealth Receive Modal */}
          <StealthReceiveModal
            visible={showStealthReceive}
            onClose={() => setShowStealthReceive(false)}
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
  stealthReceiveButton: {
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  stealthReceiveText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
  },
  stealthPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  stealthPaymentAmount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
  },
  stealthPaymentStatus: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Sansation-Regular',
  },
  spendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  spendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Sansation-Bold',
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
    fontFamily: 'Sansation-Bold',
  },
});
