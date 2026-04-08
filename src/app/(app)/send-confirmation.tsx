import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSendTransaction } from '../../hooks/transactions/useSendSimpleTransaction';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';
import SlideToConfirm from '../../components/SlideToConfirm';
import ChevronLeft from '../../assets/buttons/chevron-left.svg';
import ChevronDown from '../../assets/buttons/chevron-down.svg';

interface SendConfirmationProps {
  amount: string;
  walletType?: 'cash' | 'stealf';
  onBack: () => void;
  onClose?: () => void;
  onSuccess: () => void;
}

export default function SendConfirmation({ amount, walletType = 'cash', onBack, onClose, onSuccess }: SendConfirmationProps) {
  const router = useRouter();
  const { userData } = useAuth();
  const senderWallet = walletType === 'stealf' ? userData?.stealf_wallet : userData?.cash_wallet;
  const { sendTransaction, loading } = useSendTransaction();
  const { tokens } = useWalletInfos(senderWallet || '');

  const solToken = tokens.find(t => t.tokenMint === null);
  const solBalance = solToken?.balance ?? 0;

  const getSolPrice = (): number => {
    if (solToken && solToken.balance > 0) {
      return solToken.balanceUSD / solToken.balance;
    }
    return 0;
  };

  const [externalAddress, setExternalAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setExternalAddress(text.trim());
  };

  const handleConfirm = async () => {
    if (!externalAddress) {
      Alert.alert('Error', 'Please enter a destination address');
      return;
    }
    if (!senderWallet) {
      Alert.alert('Error', 'No wallet found');
      return;
    }

    try {
      const amountUSD = parseFloat(amount);
      const solPrice = getSolPrice();
      if (solPrice <= 0) {
        Alert.alert('Error', 'Unable to get SOL price');
        return;
      }
      const amountSOL = Math.floor((amountUSD / solPrice) * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;

      await sendTransaction(senderWallet, externalAddress, amountSOL, null, undefined, walletType, solBalance);

      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    } catch (err: any) {
      if (__DEV__ && !err.isGuard) console.error('Transaction error:', err);
      Alert.alert(
        err.isGuard ? 'Validation Error' : 'Transaction Failed',
        err.message || 'An error occurred'
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#000', '#000']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Grabber — matches send.tsx: paddingTop 12 on grabber + paddingTop 40 on header */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ alignItems: 'center', paddingBottom: 40 }}
            >
              <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Sansation-Bold', marginBottom: 24, textAlign: 'center' }}>
              Confirm
            </Text>

            {/* ASSET */}
            <Text style={styles.sectionLabel}>ASSET</Text>
            <View style={styles.selectorRow}>
              <Image source={require('../../assets/solana.png')} style={{ width: 32, height: 32 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', flex: 1, marginLeft: 12 }}>SOL</Text>
              <ChevronDown width={16} height={16} style={{ opacity: 0.3 }} />
            </View>

            {/* NETWORK */}
            <Text style={styles.sectionLabel}>NETWORK</Text>
            <View style={styles.selectorRow}>
              <Image source={require('../../assets/solana.png')} style={{ width: 32, height: 32 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', flex: 1, marginLeft: 12 }}>Solana Devnet</Text>
            </View>

            {/* SEND TO */}
            <Text style={styles.sectionLabel}>SEND TO</Text>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              minHeight: 80,
              marginBottom: 12,
            }}>
              <TextInput
                style={{ color: '#fff', fontSize: 14, fontFamily: 'Sansation-Regular', flex: 1 }}
                placeholder="Wallet address"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={externalAddress}
                onChangeText={setExternalAddress}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </View>


            <View style={{ flex: 1 }} />

            {/* Fee recap */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>AMOUNT</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>${amount}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>NETWORK FEE</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>~$0.01</Text>
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Bold' }}>TOTAL</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Sansation-Bold' }}>${amount}</Text>
              </View>
            </View>

            {/* Slide to confirm */}
            <SlideToConfirm onConfirm={handleConfirm} loading={loading} />

            {/* Back button — below slide */}
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 14,
                paddingHorizontal: 20,
                alignItems: 'center',
                marginTop: 60,
              }}
            >
              <ChevronLeft width={28} height={28} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 100 }]}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkText}>{'✓'}</Text>
          </Animated.View>
          <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
            <Text style={styles.successTitle}>Sent</Text>
            <Text style={styles.successAmount}>${amount}</Text>
            <Text style={styles.successAddress}>
              {externalAddress.substring(0, 6)}...{externalAddress.substring(externalAddress.length - 4)}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
            <TouchableOpacity style={styles.primaryAction} onPress={onSuccess} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Make new transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => { onSuccess(); onClose ? onClose() : router.back(); }} activeOpacity={0.8}>
              <Text style={styles.secondaryActionText}>Back to home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  successScreen: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  checkText: { fontSize: 32, color: 'white', fontWeight: '300' },
  successInfo: { alignItems: 'center', marginBottom: 60 },
  successTitle: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular', marginBottom: 8 },
  successAmount: { fontSize: 36, color: 'white', fontFamily: 'Sansation-Light', marginBottom: 12 },
  successAddress: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontFamily: 'Sansation-Regular' },
  successActions: { width: '100%', gap: 12 },
  primaryAction: { backgroundColor: 'rgba(240,235,220,0.95)', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  primaryActionText: { fontSize: 16, fontWeight: '600', color: '#000', fontFamily: 'Sansation-Bold' },
  secondaryAction: { paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  secondaryActionText: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' },
});
