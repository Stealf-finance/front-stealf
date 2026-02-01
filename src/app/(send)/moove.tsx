import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useAuth } from '../../contexts/AuthContext';
import { usePrivacyBalance } from '../../hooks/usePrivacyBalance';
import { useWalletInfos } from '../../hooks/useWalletInfos';

// Import SVG icons
import ArrowIcon from '../../assets/buttons/arrow.svg';
import ComebackIcon from '../../assets/buttons/comeback.svg';

interface MooveScreenProps {
  onBack: () => void;
}

export default function MooveScreen({ onBack }: MooveScreenProps) {
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'wealthToCash' | 'cashToWealth'>('wealthToCash');
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const { userData } = useAuth();
  const { totalUSD: cashBalance } = usePrivacyBalance();
  const { balance: wealthBalance } = useWalletInfos(userData?.stealf_wallet || '');

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

  const toggleDirection = () => {
    Animated.timing(rotateAnim, {
      toValue: direction === 'wealthToCash' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setDirection(prev => prev === 'wealthToCash' ? 'cashToWealth' : 'wealthToCash');
  };

  const arrowRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleMove = () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amountNum = parseFloat(amount);
    const sourceBalance = direction === 'wealthToCash' ? (wealthBalance || 0) : cashBalance;

    if (amountNum > sourceBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    // TODO: Implement the actual move logic
    Alert.alert('Success', `Moving ${amount} SOL from ${direction === 'wealthToCash' ? 'Wealth' : 'Cash'} to ${direction === 'wealthToCash' ? 'Cash' : 'Wealth'}`);
    setAmount('');
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
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Move money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Balance Cards */}
        <View style={styles.balancesContainer}>
          {/* Wealth Card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>Wealth</Text>
                <Text style={styles.balanceSubtext}>
                  {(wealthBalance || 0).toFixed(2)} USD
                </Text>
              </View>
              <Text style={[styles.cardAmountRight, amount ? styles.cardAmountActive : null]}>
                {direction === 'wealthToCash' ? '-' : '+'}{amount || '0'}
              </Text>
            </View>
          </View>

          {/* Arrow Button */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={toggleDirection}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
              <ArrowIcon width={24} height={24} />
            </Animated.View>
          </TouchableOpacity>

          {/* Cash Card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>Cash</Text>
                <Text style={styles.balanceSubtext}>
                  {cashBalance.toFixed(2)} USD
                </Text>
              </View>
              <Text style={[styles.cardAmountRight, amount ? styles.cardAmountActive : null]}>
                {direction === 'wealthToCash' ? '+' : '-'}{amount || '0'}
              </Text>
            </View>
          </View>
        </View>




        {/* Move Button */}
        <TouchableOpacity
          style={styles.moveButton}
          onPress={handleMove}
          activeOpacity={0.8}
        >
          <Text style={styles.moveButtonText}>Move</Text>
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
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('.')}>
              <Text style={styles.keyText}>.</Text>
            </TouchableOpacity>
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
    paddingBottom: 20,
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
  balancesContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    minHeight: 80,
  },
  sourceCard: {
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
  },
  cardSpacer: {
    height: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardAmountRight: {
    fontSize: 38,
    color: 'rgba(255, 255, 255, 0.15)',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  cardAmountActive: {
    color: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 22,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
    marginBottom: 4,
  },
  minusSign: {
    fontSize: 28,
    color: 'white',
    fontFamily: 'Sansation-Light',
  },
  balanceAmount: {
    fontSize: 36,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
    marginBottom: 4,
    height: 45,
  },
  balanceSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: -24,
    zIndex: 10,
  },
  noteContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(45, 45, 45, 0.4)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notePlaceholder: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  noteCounter: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
  moveButton: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  moveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Sansation-Bold',
  },
  keyboard: {
    paddingHorizontal: 40,
    paddingBottom: 20,
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
