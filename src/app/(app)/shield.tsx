import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LAMPORTS_PER_SOL, toAddress } from '../../services/solana/kit';
import { useUmbra, UmbraError } from '../../hooks/transactions/useUmbra';
import { Image } from 'expo-image';
import ChevronDown from '../../assets/buttons/chevron-down.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { SOL_MINT } from '../../constants/solana';
import { useQueryClient } from '@tanstack/react-query';


const ASSETS = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT },
];

export default function ShieldScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const { tokens } = useWalletInfos(userData?.stealf_wallet || '');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  const { deposit, loading } = useUmbra();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    const digits = amount.replace('.', '');
    if (num !== '.' && digits.length >= 10) return;
    if (amount.includes('.') && num !== '.' && amount.split('.')[1].length >= 9) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleShield = async () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const amountSOL = parseFloat(amount);
      const amountLamports = BigInt(Math.floor(amountSOL * LAMPORTS_PER_SOL));
      const result = await deposit(toAddress(selectedAsset.mint), amountLamports);

      const sig = typeof result === 'string'
        ? result
        : (result as any)?.callbackSignature || (result as any)?.queueSignature || '';
      setTransactionSignature(sig);

      queryClient.invalidateQueries({ queryKey: ['shielded-balance'] });

      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    } catch (err: any) {
      if (__DEV__) console.error('[DepositPrivateCash] Shield error:', err);
      const friendly = err instanceof UmbraError
        ? err.userMessage
        : (err?.message || 'An error occurred while shielding');
      Alert.alert('Shield Failed', friendly);
    }
  };

  const handleNewShield = () => {
    setShowSuccess(false);
    fadeAnim.setValue(0);
    checkScale.setValue(0);
    contentFade.setValue(0);
    setTransactionSignature(null);
    setAmount('');
  };

  const handleCloseAndBack = () => {
    handleNewShield();
    router.back();
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
          <Text style={styles.headerTitle}>Deposit</Text>
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
            You deposit in Shielded Pool
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Amount */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={{
                color: amount ? '#f1ece1' : 'rgba(255,255,255,0.25)',
                fontSize: 42,
                fontFamily: 'Sansation-Light',
                fontVariant: ['tabular-nums'],
                flex: 1,
                marginRight: 12,
              }}
            >
              {amount || '0'}
            </Text>

            {/* Asset Selector */}
            <TouchableOpacity
              onPress={() => { if (ASSETS.length > 1) setShowAssetPicker(!showAssetPicker); }}
              activeOpacity={ASSETS.length > 1 ? 0.7 : 1}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 20,
                paddingVertical: 6,
                paddingRight: 12,
                paddingLeft: 6,
                gap: 6,
              }}
            >
              <Image
                source={require('../../assets/solana.png')}
                style={{ width: 28, height: 28 }}
              />
              <Text style={{ color: '#f1ece1', fontSize: 16, fontFamily: 'Sansation-Bold' }}>{selectedAsset.symbol}</Text>
              <ChevronDown width={14} height={14} style={{ opacity: 0.4 }} />
            </TouchableOpacity>
          </View>

          {/* Balance info */}
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Sansation-Regular', textAlign: 'right' }}>
            {(tokens.find(t => t.tokenSymbol === selectedAsset.symbol)?.balance ?? 0).toFixed(4)} {selectedAsset.symbol}
          </Text>
        </View>

        {/* Shield Button */}
        <TouchableOpacity
          style={[styles.shieldButton, loading && { opacity: 0.5 }]}
          onPress={handleShield}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.shieldButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

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

      {/* Success overlay — same animation as send-confirmation */}
      {showSuccess && (
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 100 }]}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkText}>{'✓'}</Text>
          </Animated.View>
          <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
            <Text style={styles.successTitleNew}>Shielded</Text>
            <Text style={styles.successAmount}>{amount} {selectedAsset.symbol}</Text>
            <Text style={styles.successAddress}>Into Umbra vault</Text>
          </Animated.View>
          <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
            <TouchableOpacity style={styles.primaryAction} onPress={handleNewShield} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Shield more</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={handleCloseAndBack} activeOpacity={0.8}>
              <Text style={styles.secondaryActionText}>Back to home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
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
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
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
  shieldButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    marginHorizontal: 40,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 25,
  },
  shieldButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 100, 0.2)',
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(100, 255, 100, 0.2)',
    borderWidth: 3,
    borderColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: '#00ff88',
    fontSize: 40,
    fontWeight: 'bold',
  },
  successTitle: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Sansation-Bold',
  },
  successMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Sansation-Regular',
  },
  signatureContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  signatureLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Sansation-Regular',
  },
  signatureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  explorerButton: {
    backgroundColor: 'rgba(100, 255, 100, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  explorerButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },

  // Success overlay (matches send-confirmation.tsx)
  successScreen: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  checkText: { fontSize: 32, color: 'white', fontWeight: '300' },
  successInfo: { alignItems: 'center', marginBottom: 60 },
  successTitleNew: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular', marginBottom: 8 },
  successAmount: { fontSize: 36, color: 'white', fontFamily: 'Sansation-Light', marginBottom: 12 },
  successAddress: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontFamily: 'Sansation-Regular' },
  successActions: { width: '100%', gap: 12 },
  primaryAction: { backgroundColor: 'rgba(240,235,220,0.95)', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  primaryActionText: { fontSize: 16, fontWeight: '600', color: '#000', fontFamily: 'Sansation-Bold' },
  secondaryAction: { paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  secondaryActionText: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' },
});
