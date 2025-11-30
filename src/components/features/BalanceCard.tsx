import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useWallet, useBalance } from '../../hooks';
import { usePrivateBalance } from '../../hooks/usePrivateBalance';

interface BalanceCardProps {
  onWithdraw?: () => void;
  onTopUp?: () => void;
  onExchange?: () => void;
  isPrivacy?: boolean;
  privacyAccountNumber?: number;
  isDemo?: boolean;
}

export default function BalanceCard({ onWithdraw, onTopUp, onExchange, isPrivacy = false, privacyAccountNumber = 1, isDemo = false }: BalanceCardProps) {
  const { walletAddress, loading: walletLoading } = useWallet();
  const { balance, loading, error } = useBalance(walletAddress);

  // Use private balance hook when isPrivacy is true
  const { totalBalance: privateBalanceUSD, totalBalanceSOL: privateBalanceSOL, loading: privateLoading, error: privateError } = usePrivateBalance();

  // Load fonts
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
  });

  // Debug logs
  useEffect(() => {
    console.log('🔍 BalanceCard - walletAddress:', walletAddress);
    console.log('🔍 BalanceCard - walletLoading:', walletLoading);
    console.log('🔍 BalanceCard - balance:', balance);
    console.log('🔍 BalanceCard - error:', error);
  }, [walletAddress, walletLoading, balance, error]);


  // Garder l'ancien montant pendant le chargement pour éviter les flashs
  const [displayBalance, setDisplayBalance] = React.useState<number>(0);

  // MODIFIED: Afficher la balance en SOL directement
  const getBalanceInSOL = () => {
    // Si c'est le mode demo, retourner un montant hardcodé
    if (isDemo) {
      return 2.5;
    }

    // Si c'est la page Privacy, seul le compte 1 a une vraie balance
    if (isPrivacy) {
      // Seul le compte 1 affiche la vraie balance, les autres affichent 0
      if (privacyAccountNumber === 1) {
        return privateBalanceSOL || 0;
      }
      return 0; // Comptes 2, 3, etc. pas encore implémentés
    }

    if (!balance) return 0;

    // Afficher directement le montant en SOL
    return balance.sol || 0;
  };

  React.useEffect(() => {
    if (isDemo) {
      setDisplayBalance(2.5);
    } else if (isPrivacy) {
      // Pour le wallet privé, seul le compte 1 a une vraie balance
      if (privacyAccountNumber === 1) {
        setDisplayBalance(privateBalanceSOL || 0);
      } else {
        setDisplayBalance(0); // Comptes 2, 3, etc. pas encore implémentés
      }
    } else if (balance) {
      setDisplayBalance(getBalanceInSOL());
    }
  }, [balance, isDemo, isPrivacy, privateBalanceSOL, privacyAccountNumber]);

  const totalSOL = displayBalance || 0;

  return (
    <View style={styles.container}>
      <BlurView
        intensity={30}
        tint="dark"
        style={styles.blurContainer}
      >
        <LinearGradient
          colors={['rgba(40, 40, 40, 0.4)', 'rgba(20, 20, 20, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          {/* Balance Section */}
          <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>
            {isPrivacy ? `Privacy Balance ${privacyAccountNumber}` : 'Total Balance'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.balanceAmount}>{totalSOL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={styles.solLabel}> SOL</Text>
          </View>
        </View>

        {/* Action Buttons - Apple Card Style */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onTopUp}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Text style={styles.plusIcon}>+</Text>
            </View>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onWithdraw}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Text style={styles.arrowIcon}>‹</Text>
            </View>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>

          <View style={styles.moreButtonWrapper}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={onExchange}
              activeOpacity={0.8}
            >
              <View style={styles.moreIconContainer}>
                <Text style={styles.moreIcon}>•••</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: -10,
    zIndex: 2,
  },
  blurContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderWidth: 0,
    minHeight: 240,
  },
  balanceSection: {
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 8,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 1,
    fontFamily: 'Sansation-Regular',
  },
  dollarSign: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'normal',
    marginRight: 4,
    fontFamily: 'Sansation-Regular',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 52,
    fontWeight: 'normal',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  solLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 28,
    fontWeight: 'normal',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  balanceChange: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginTop: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    paddingLeft: 18,
    borderRadius: 38,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 140,
    justifyContent: 'flex-start',
  },
  buttonIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Regular',
  },
  plusIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    includeFontPadding: false,
  },
  arrowIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '400',
    transform: [{ rotate: '90deg' }],
    textAlign: 'center',
    includeFontPadding: false,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  sendButtonIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Regular',
  },
  moreButtonWrapper: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(100, 100, 100, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    fontFamily: 'Sansation-Regular',
  },
});
