import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import type { SendScreenProps } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';
import { usePrivacyCashTransfer } from '../../hooks/usePrivacyCashTransfer';
import { useAuthenticatedApi } from '../../services/clientStealf';
import { createGetSolPriceUSD } from '../../services/fetchWalletInfos';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { VAULT_ADDRESS } from '../../constants/vault';

interface DepositPrivateCashProps extends SendScreenProps {
  walletType?: 'cash' | 'privacy';
}

export default function DepositPrivateCash({ onBack, walletType = 'cash' }: DepositPrivateCashProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { userData } = useAuth();
  const { session } = useTurnkey();

  const sourceWallet = walletType === 'privacy'
    ? userData?.stealf_wallet
    : userData?.cash_wallet;

  const { tokens } = useWalletInfos(sourceWallet || '');
  const { initiatePrivateDeposit } = usePrivacyCashTransfer();
  const api = useAuthenticatedApi();

  const solToken = tokens.find(t => t.tokenMint === null);
  const solBalance = solToken?.balance || 0;
  const solBalanceUSD = solToken?.balanceUSD || 0;

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleContinue = async () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!sourceWallet) {
      Alert.alert('Error', 'No wallet found');
      return;
    }

    if (!session?.token) {
      Alert.alert('Error', 'No session token found');
      return;
    }

    if (isLoading) {
      return; // Prevent multiple submissions
    }

    setIsLoading(true);

    try {
      // Convert USD → SOL
      const getSolPrice = createGetSolPriceUSD(api);
      const priceData = await getSolPrice();
      const solPrice = priceData?.price_usd || priceData?.price || 0;

      if (solPrice === 0) {
        throw new Error('Unable to fetch SOL price. Please try again.');
      }

      const amountSOL = parseFloat(amount) / solPrice;

      const transfer = await initiatePrivateDeposit(
        sourceWallet,
        amountSOL,
        session.token
      );

      console.log('[DepositPrivateCash] Deposit successful:', transfer.transferId);

      Alert.alert(
        'Success',
        `Deposit of ${amount} USD completed successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setAmount('');
              onBack();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('[DepositPrivateCash] Deposit error:', err);
      Alert.alert(
        'Deposit Failed',
        err.message || 'An error occurred while processing your deposit'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deposit</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountText}>{amount || '0'}</Text>
            <Text style={styles.currencyText}>SOL</Text>
          </View>
          <Text style={styles.balanceText}>Your balance {solBalance.toFixed(6)} SOL (${solBalanceUSD.toFixed(2)})</Text>
        </View>


        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.continueText}>Deposit</Text>
          )}
        </TouchableOpacity>

        {/* Custom Keyboard */}
        <View style={styles.keyboard}>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('1')}>
              <Text style={styles.keyText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('2')}>
              <Text style={styles.keyText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('3')}>
              <Text style={styles.keyText}>3</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('4')}>
              <Text style={styles.keyText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('5')}>
              <Text style={styles.keyText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('6')}>
              <Text style={styles.keyText}>6</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('7')}>
              <Text style={styles.keyText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('8')}>
              <Text style={styles.keyText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('9')}>
              <Text style={styles.keyText}>9</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <View style={styles.key} />
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleDelete}>
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  amountText: {
    fontSize: 72,
    fontWeight: '300',
    color: 'white',
    letterSpacing: -2,
    fontFamily: 'Sansation-Light',
  },
  currencyText: {
    fontSize: 32,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
    fontFamily: 'Sansation-Light',
  },
  balanceText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    fontFamily: 'Sansation-Regular',
  },
  accountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  accountButton: {
    alignItems: 'center',
  },
  accountIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(45, 30, 65, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accountIcon: {
    width: 40,
    height: 40,
  },
  accountText: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Sansation-Regular',
  },
  continueButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    marginHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 25,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(240, 235, 220, 0.5)',
    opacity: 0.6,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  keyboard: {
    paddingHorizontal: 40,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  key: {
    width: 90,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
  },
});