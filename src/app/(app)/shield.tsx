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
import { useUmbra } from '../../hooks/transactions/useUmbra';
import { Image } from 'expo-image';
import ChevronDown from '../../assets/buttons/chevron-down.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { SOL_MINT } from '../../constants/solana';


const ASSETS = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT },
];

export default function ShieldScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const { tokens } = useWalletInfos(userData?.stealf_wallet || '');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  const { deposit, loading, error } = useUmbra();

  const successAnimation = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

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
      const signature = await deposit(toAddress(selectedAsset.mint), amountLamports);

      if (!signature) {
        throw new Error(error || 'Shield failed');
      }

      setTransactionSignature(typeof signature === 'string' ? signature : JSON.stringify(signature));
      setShowSuccessModal(true);

      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err: any) {
      if (__DEV__) console.error('[DepositPrivateCash] Shield error:', err);
      Alert.alert(
        'Shield Failed',
        err.message || 'An error occurred while shielding'
      );
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    successAnimation.setValue(0);
    checkmarkScale.setValue(0);
    setTransactionSignature(null);
    setAmount('');
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
          <Text style={styles.headerTitle}>Shield</Text>
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
            You shield
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Amount */}
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
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold' }}>{selectedAsset.symbol}</Text>
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

        {/* Success Modal */}
        <Modal
          transparent={true}
          visible={showSuccessModal}
          animationType="none"
          onRequestClose={closeSuccessModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeSuccessModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    opacity: successAnimation,
                    transform: [
                      {
                        scale: successAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.checkmarkCircle,
                    {
                      transform: [{ scale: checkmarkScale }],
                    },
                  ]}
                >
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>

                <Text style={styles.successTitle}>Shielded</Text>
                <Text style={styles.successMessage}>
                  Your funds have been shielded into the Umbra vault
                </Text>

                {transactionSignature && (
                  <TouchableOpacity
                    style={styles.signatureContainer}
                    onPress={async () => {
                      await Clipboard.setStringAsync(transactionSignature);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signatureLabel}>Signature (tap to copy):</Text>
                    <Text style={styles.signatureText}>
                      {transactionSignature.substring(0, 20)}...
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.explorerButton}
                  onPress={() => {
                    Linking.openURL(`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.explorerButtonText}>View on Explorer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.explorerButton, { marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.3)' }]}
                  onPress={closeSuccessModal}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.explorerButtonText, { color: 'white' }]}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
});
