import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import ComebackIcon from '../../assets/buttons/comeback.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useSendTransaction } from '../../hooks/transactions/useSendSimpleTransaction';
import SlideToConfirm from '../../components/SlideToConfirm';

interface SendConfirmationProps {
  amount: string;
  onBack: () => void;
  onClose?: () => void;
  onSuccess: () => void;
  transferType?: 'basic' | 'private';
}

export default function SendConfirmation({ amount, onBack, onClose, onSuccess, transferType = 'private' }: SendConfirmationProps) {
  const { userData } = useAuth();
  const { sendTransaction, loading: simpleLoading } = useSendTransaction();

  const [externalAddress, setExternalAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const handleConfirm = async () => {
    if (!externalAddress) {
      Alert.alert('Error', 'Please enter a destination address');
      return;
    }

    if (!userData?.stealf_wallet) {
      Alert.alert('Error', 'No privacy wallet found');
      return;
    }

    try {
      const amountSOL = parseFloat(amount);
      await sendTransaction(
        userData.stealf_wallet,
        externalAddress,
        amountSOL
      );

      // Show success
      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(contentFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

    } catch (err: any) {
      console.error('[SendPrivateConfirmation] Transfer error:', err);
      Alert.alert(
        'Transfer Failed',
        err.message || 'An error occurred while sending the transaction'
      );
    }
  };

  const handleNewTransfer = () => {
    onSuccess();
  };

  const handleBackToHome = () => {
    onSuccess();
    if (onClose) onClose();
    else onBack();
  };

  const isLoading = simpleLoading;

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  if (showSuccess) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.successScreen, { opacity: fadeAnim }]}>
          {/* Checkmark */}
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkText}>{'✓'}</Text>
          </Animated.View>

          {/* Info */}
          <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
            <Text style={styles.successTitle}>Sent</Text>
            <Text style={styles.successAmount}>{amount} SOL</Text>
            <Text style={styles.successAddress}>
              {externalAddress.substring(0, 6)}...{externalAddress.substring(externalAddress.length - 4)}
            </Text>
          </Animated.View>

          {/* Actions */}
          <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleNewTransfer}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Make new transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleBackToHome}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionText}>Back to home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
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
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose || onBack} activeOpacity={0.8}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content with KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>${amount}</Text>
          </View>

          {/* Network */}
          <View style={styles.section}>
            <Text style={styles.label}>Network</Text>
            <Text style={styles.value}>Solana</Text>
          </View>

          {/* To */}
          <View style={styles.section}>
            <Text style={styles.label}>To</Text>

            {/* Address Input */}
            <View style={styles.addressInputContainer}>
              <TextInput
                style={styles.addressInput}
                placeholder="Paste wallet address..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={externalAddress}
                onChangeText={setExternalAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Slide to Confirm */}
          <View style={styles.buttonContainer}>
            <SlideToConfirm onConfirm={handleConfirm} loading={isLoading} />
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 48,
  },
  label: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  value: {
    fontSize: 32,
    color: 'white',
    fontWeight: '400',
    fontFamily: 'Sansation-Light',
  },
  addressInputContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addressInput: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  // Success screen
  successScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  checkText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
  successInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  successTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 36,
    color: 'white',
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
    marginBottom: 12,
  },
  successAddress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryAction: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  secondaryAction: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
});
