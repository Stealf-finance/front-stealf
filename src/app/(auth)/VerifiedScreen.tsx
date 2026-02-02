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
  const [coldWalletPrivateKey, setColdWalletPrivateKey] = useState<string | undefined>();

  // Step 1: Passkey auth + cash wallet creation via Turnkey
  useEffect(() => {
    const createPasskey = async () => {
      try {
        const authResult = await signUpWithPasskey({
          createSubOrgParams: {
            subOrgName: `User ${email}`,
            customWallet: {
              walletName: "STEALF wallets",
              walletAccounts: [
                {
                  curve: "CURVE_ED25519" as const,
                  pathFormat: 'PATH_FORMAT_BIP32' as const,
                  path: "m/44'/501'/0'/0'",
                  addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
                },
              ],
            },
          },
        });

        const { sessionToken: token } = authResult;
        if (!token) throw new Error('No session token received from Turnkey');

        setSessionToken(token);

        // Get the cash wallet address
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
      let stealfWallet = '';

      if (choice.mode === 'create' && choice.storage === 'turnkey') {
        const result = await setupWallet.handleCreateAndStoreWallet();
        if (!result.success) throw new Error(result.error);
        stealfWallet = result.walletAddress || '';
      } else if (choice.mode === 'create' && choice.storage === 'cold') {
        const result = await setupWallet.handleCreateWallet();
        if (!result.success) throw new Error(result.error);
        stealfWallet = result.walletAddress || '';
        setColdWalletPrivateKey(result.privateKey);
      } else if (choice.mode === 'import' && choice.storage === 'turnkey') {
        // Import into Turnkey requires mnemonic — here we receive a private key
        // Store locally + in Turnkey via import
        const result = await setupWallet.handleImportAndStoreWallet(choice.privateKey);
        if (!result.success) throw new Error(result.error);
        stealfWallet = result.walletAddress || '';
      } else if (choice.mode === 'import' && choice.storage === 'skip') {
        const result = await setupWallet.handleImportWallet(choice.privateKey);
        if (!result.success) throw new Error(result.error);
        stealfWallet = result.walletAddress || '';
      }

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
          stealf_wallet: stealfWallet,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      if (!data.data?.user) throw new Error('Backend did not return user data');

      // If cold wallet, show the private key before finishing
      if (choice.mode === 'create' && choice.storage === 'cold' && coldWalletPrivateKey) {
        setScreenState('showPrivateKey');
        setLoading(false);
        return;
      }

      // Otherwise finish immediately
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

  // Called after cold wallet user confirms they saved the key
  const handleColdWalletConfirmed = () => {
    // Re-fetch user data is not needed, it was already saved in backend
    // Just set user data to trigger auth
    // We need to call the backend again or store the response — simplest: re-call
    finishAuthFromBackend();
  };

  const finishAuth = (user: any) => {
    setUserData({
      email: user.email,
      username: user.username || user.pseudo || pseudo,
      cash_wallet: user.cash_wallet,
      stealf_wallet: user.stealf_wallet,
      subOrgId: user.subOrgId,
    });
  };

  const finishAuthFromBackend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ email, pseudo, cash_wallet: cashWallet }),
      });

      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      if (data.data?.user) finishAuth(data.data.user);
    } catch (err: any) {
      console.error('Error finishing auth:', err);
    } finally {
      setLoading(false);
    }
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
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000000', '#000000', '#000000']} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.background}>
          <View style={styles.content}>
            <Text style={styles.title}>Setting up your wallet</Text>
            <Text style={styles.subtitle}>This may take a few moments...</Text>
            <ActivityIndicator size="large" color="rgba(240, 235, 220, 0.95)" style={styles.loader} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error
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
  container: { flex: 1 },
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