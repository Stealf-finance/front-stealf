import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import WalletSetupScreen, { WalletSetupChoice } from './WalletSetupScreen';
import { useSetupWallet } from '../../hooks/useSetupWallet';
import { useAuth as useAuthContext } from '../../contexts/AuthContext';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { CASH_WALLET_CONFIG } from '../../constants/turnkey';
import { WelcomeLoader } from '../../components/WelcomeLoader';
import Logo from '../../assets/logo/logo.svg';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface VerifiedScreenProps {
  email: string;
  pseudo: string;
}

type ScreenState = 'passkey' | 'walletSetup' | 'creatingWallet' | 'showPrivateKey' | 'error';

export default function VerifiedScreen({ email, pseudo }: VerifiedScreenProps) {
  const { signUpWithPasskey, refreshWallets } = useTurnkey();
  const { setUserData } = useAuthContext();
  const setupWallet = useSetupWallet();

  const [screenState, setScreenState] = useState<ScreenState>('passkey');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [cashWallet, setCashWallet] = useState<string>('');
  const [stealfWallet, setStealfWallet] = useState<string>('');
  const [coldWalletPrivateKey, setColdWalletPrivateKey] = useState<string | undefined>();
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [isColdWallet, setIsColdWallet] = useState(false);

  //Passkey auth + cash wallet creation via Turnkey
  useEffect(() => {
    const createPasskey = async () => {
      try {
        const authResult = await signUpWithPasskey({
          createSubOrgParams: {
            subOrgName: `User ${email}`,
            customWallet: CASH_WALLET_CONFIG,
          },
        });

        const { sessionToken: token } = authResult;
        if (!token) throw new Error('No session token received from Turnkey');

        setSessionToken(token);

        const wallets = await refreshWallets();
        const cashAddr = wallets?.[0]?.accounts?.[0]?.address || '';
        if (!cashAddr) throw new Error('Failed to retrieve cash wallet address');

        setCashWallet(cashAddr);
        setScreenState('walletSetup');
      } catch (err: any) {
        console.error('Passkey creation failed:', err);
        setError(err?.message || 'Failed to create passkey');
        setScreenState('error');
      }
    };

    createPasskey();
  }, [email]);

  // Step 2: User picks wallet setup, we call the right function then register with backend
  const handleWalletChoice = async (choice: WalletSetupChoice) => {
    setLoading(true);
    setScreenState('creatingWallet');

    try {
      let walletAddr = '';
      const cold = choice.storage === 'cold' || choice.storage === 'skip';
      setIsColdWallet(cold);

      if (choice.mode === 'create' && choice.storage === 'turnkey') {
        const result = await setupWallet.handleCreateAndStoreWallet();
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
      } else if (choice.mode === 'create' && choice.storage === 'cold') {
        const result = await setupWallet.handleCreateWallet();
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
        setColdWalletPrivateKey(result.privateKey);
      } else if (choice.mode === 'import' && choice.storage === 'turnkey') {
        const result = await setupWallet.handleImportAndStoreWallet(choice.mnemonic);
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
      } else if (choice.mode === 'import' && choice.storage === 'skip') {
        const result = await setupWallet.handleImportWallet(choice.mnemonic);
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
      }

      setStealfWallet(walletAddr);

      // Register with backend
      const response = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          email,
          pseudo,
          cash_wallet: cashWallet,
          stealf_wallet: walletAddr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      if (!data.data?.user) throw new Error('Backend did not return user data');

      if (choice.mode === 'create' && choice.storage === 'cold') {
        setPendingUser(data.data.user);
        setScreenState('showPrivateKey');
        setLoading(false);
        return;
      }

      finishAuth(data.data.user);
    } catch (err: any) {
      console.error('Wallet setup failed:', err);
      setError(err?.message || 'Failed to set up wallet');
      setScreenState('error');
      Alert.alert('Error', err?.message || 'Failed to set up wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleColdWalletConfirmed = () => {
    setColdWalletPrivateKey(undefined);
    if (pendingUser) finishAuth(pendingUser);
  };

  const finishAuth = (user: any) => {
    setPendingUser(null);
    setUserData({
      email: user.email,
      username: user.username || user.pseudo || pseudo,
      cash_wallet: user.cash_wallet,
      stealf_wallet: user.stealf_wallet,
      subOrgId: user.subOrgId,
      coldWallet: isColdWallet,
    });
  };

  // --- RENDERS ---

  if (screenState === 'passkey') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#000000', '#000000']} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.background}>
          <View style={styles.content}>
            <Text style={styles.title}>Creating your account</Text>
            <Text style={styles.subtitle}>Please authenticate with {'\n'}Face ID or Touch ID</Text>
            <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" style={styles.loader} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (screenState === 'walletSetup' || screenState === 'showPrivateKey') {
    return (
      <WalletSetupScreen
        onComplete={screenState === 'showPrivateKey' ? handleColdWalletConfirmed : handleWalletChoice}
        loading={loading}
        coldWalletPrivateKey={coldWalletPrivateKey}
      />
    );
  }

  if (screenState === 'creatingWallet') {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#000000', '#000000']} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.background}>
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Wallet Creation Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: '300', color: 'white', fontFamily: 'Sansation-Light', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Sansation-Regular', marginBottom: 40, textAlign: 'center', lineHeight: 24 },
  loader: { marginBottom: 32 },
  errorIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.3)' },
  errorIcon: { fontSize: 56 },
  errorTitle: { fontSize: 24, fontWeight: '600', color: 'white', fontFamily: 'Sansation-Bold', marginBottom: 16, textAlign: 'center' },
  errorText: { fontSize: 15, color: 'rgba(255, 68, 68, 0.9)', fontFamily: 'Sansation-Regular', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});