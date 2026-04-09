import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LAMPORTS_PER_SOL, toAddress } from '../../services/solana/kit';
import { useUmbra, UmbraError } from '../../hooks/transactions/useUmbra';
import { Image } from 'expo-image';
import ChevronDown from '../../assets/buttons/chevron-down.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useShieldedBalance } from '../../hooks/wallet/useShieldedBalance';
import { SOL_MINT } from '../../constants/solana';
import { useQueryClient } from '@tanstack/react-query';

const ASSETS = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT },
];

export default function UnshieldScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const { data: shielded } = useShieldedBalance();
  const shieldedSol = shielded?.sol ?? 0;

  const [amount, setAmount] = useState('');
  const [selectedAsset] = useState(ASSETS[0]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { withdraw, loading } = useUmbra();

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

  const handleUnshield = async () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!userData?.stealf_wallet) {
      Alert.alert('Error', 'No privacy wallet found');
      return;
    }
    const amountSOL = parseFloat(amount);
    if (amountSOL > shieldedSol) {
      Alert.alert('Error', `Insufficient shielded balance. You have ${shieldedSol.toFixed(4)} SOL.`);
      return;
    }

    try {
      const amountLamports = BigInt(Math.floor(amountSOL * LAMPORTS_PER_SOL));
      // Withdraw to the user's own stealth wallet — funds re-appear in the visible balance
      await withdraw(toAddress(selectedAsset.mint), amountLamports);

      queryClient.invalidateQueries({ queryKey: ['shielded-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData.stealf_wallet] });

      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    } catch (err: any) {
      if (__DEV__) console.error('[Unshield] error:', err);
      const friendly = err instanceof UmbraError
        ? err.userMessage
        : (err?.message || 'An error occurred while unshielding');
      Alert.alert('Unshield Failed', friendly);
    }
  };

  const handleNewUnshield = () => {
    setShowSuccess(false);
    fadeAnim.setValue(0);
    checkScale.setValue(0);
    contentFade.setValue(0);
    setAmount('');
  };

  const handleCloseAndBack = () => {
    handleNewUnshield();
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
          <Text style={styles.headerTitle}>Withdraw</Text>
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
            You withdraw from Shielded Pool
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
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold' }}>{selectedAsset.symbol}</Text>
              <ChevronDown width={14} height={14} style={{ opacity: 0.4 }} />
            </TouchableOpacity>
          </View>

          {/* Shielded balance info */}
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Sansation-Regular', textAlign: 'right' }}>
            {shieldedSol.toFixed(4)} {selectedAsset.symbol} shielded
          </Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.shieldButton, loading && { opacity: 0.5 }]}
          onPress={handleUnshield}
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
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('1')}><Text style={styles.keyText}>1</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('2')}><Text style={styles.keyText}>2</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('3')}><Text style={styles.keyText}>3</Text></TouchableOpacity>
          </View>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('4')}><Text style={styles.keyText}>4</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('5')}><Text style={styles.keyText}>5</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('6')}><Text style={styles.keyText}>6</Text></TouchableOpacity>
          </View>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('7')}><Text style={styles.keyText}>7</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('8')}><Text style={styles.keyText}>8</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('9')}><Text style={styles.keyText}>9</Text></TouchableOpacity>
          </View>
          <View style={styles.keyboardRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('.')}><Text style={styles.keyText}>.</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('0')}><Text style={styles.keyText}>0</Text></TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleDelete}><Text style={styles.keyText}>⌫</Text></TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 100 }]}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkText}>{'✓'}</Text>
          </Animated.View>
          <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
            <Text style={styles.successTitleNew}>Withdrawn</Text>
            <Text style={styles.successAmount}>{amount} {selectedAsset.symbol}</Text>
            <Text style={styles.successAddress}>To your stealth wallet</Text>
          </Animated.View>
          <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
            <TouchableOpacity style={styles.primaryAction} onPress={handleNewUnshield} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Withdraw more</Text>
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
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
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
  keyboard: { paddingHorizontal: 40 },
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

  // Success overlay
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
