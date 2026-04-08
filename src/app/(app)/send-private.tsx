import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import ChevronDown from '../../assets/buttons/chevron-down.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { validateAmount } from '../../services/solana/transactionsGuard';
import SendPrivateConfirmation from './send-private-confirmation';

export default function SendPrivateScreen() {
  const router = useRouter();
  const { transferType = 'private' } = useLocalSearchParams<{ transferType?: string }>();
  const [amount, setAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { userData } = useAuth();
  const { balance } = useWalletInfos(userData?.stealf_wallet || '');
  const totalUSD = balance || 0;

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && num !== '.' && amount.split('.')[1].length >= 2) return;
    const digits = amount.replace('.', '');
    if (num !== '.' && digits.length >= 8) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleContinue = () => {
    const check = validateAmount(amount);
    if (!check.valid) {
      Alert.alert('Error', check.error || 'Invalid amount');
      return;
    }
    // DEV: balance check disabled
    // if (parseFloat(amount) > totalUSD) {
    //   Alert.alert('Error', `Insufficient balance. Your balance is $${totalUSD.toFixed(2)}`);
    //   return;
    // }
    setShowConfirmation(true);
  };

  const handleSuccess = () => {
    setAmount('');
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <SendPrivateConfirmation
        amount={amount}
        onBack={() => setShowConfirmation(false)}
        onClose={() => router.back()}
        onSuccess={handleSuccess}
        transferType={transferType as 'basic' | 'private'}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        {/* Grabber */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}
        >
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Private Transfer</Text>
        </View>

        {/* Amount Card */}
        <View style={{
          marginHorizontal: 20,
          marginTop: 20,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 20,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 12 }}>
            You send privately
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={{
                color: amount ? '#fff' : 'rgba(255,255,255,0.25)',
                fontSize: 42,
                fontFamily: 'Sansation-Light',
                fontVariant: ['tabular-nums'],
                flex: 1,
                marginRight: 12,
              }}
            >
              {amount || '0'}
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              paddingVertical: 6,
              paddingRight: 12,
              paddingLeft: 6,
              gap: 6,
            }}>
              <Image source={require('../../assets/solana.png')} style={{ width: 28, height: 28 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold' }}>SOL</Text>
              <ChevronDown width={14} height={14} style={{ opacity: 0.4 }} />
            </View>
          </View>

          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Sansation-Regular', textAlign: 'right' }}>
            {totalUSD.toFixed(4)} SOL
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>

        {/* Custom Keyboard */}
        <View style={styles.keyboard}>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('1')} accessibilityRole="button" accessibilityLabel="1">
              <Text style={styles.keyText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('2')} accessibilityRole="button" accessibilityLabel="2">
              <Text style={styles.keyText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('3')} accessibilityRole="button" accessibilityLabel="3">
              <Text style={styles.keyText}>3</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('4')} accessibilityRole="button" accessibilityLabel="4">
              <Text style={styles.keyText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('5')} accessibilityRole="button" accessibilityLabel="5">
              <Text style={styles.keyText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('6')} accessibilityRole="button" accessibilityLabel="6">
              <Text style={styles.keyText}>6</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('7')} accessibilityRole="button" accessibilityLabel="7">
              <Text style={styles.keyText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('8')} accessibilityRole="button" accessibilityLabel="8">
              <Text style={styles.keyText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('9')} accessibilityRole="button" accessibilityLabel="9">
              <Text style={styles.keyText}>9</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('.')} accessibilityRole="button" accessibilityLabel="Decimal point">
              <Text style={styles.keyText}>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('0')} accessibilityRole="button" accessibilityLabel="0">
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Delete">
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
    maxWidth: '90%',
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
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: 'rgba(240,235,220,0.95)',
    marginHorizontal: 40,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 25,
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
