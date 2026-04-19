import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../contexts/AuthContext';
import CopyIcon from '../../assets/buttons/copier-coller.svg';
import { useFaucetStatus, useFaucetClaim } from '../../hooks/useFaucet';

function formatCountdown(target: Date | null): string | null {
  if (!target) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m`;
}

export default function AddFundsScreen() {
  const router = useRouter();
  const { wallet = 'cash' } = useLocalSearchParams<{ wallet?: string }>();
  const { userData } = useAuth();
  const walletType: 'cash' | 'stealf' = wallet === 'stealf' ? 'stealf' : 'cash';
  const walletAddress = walletType === 'stealf' ? userData?.stealf_wallet : userData?.cash_wallet;
  const [copied, setCopied] = useState(false);

  const { data: status, refetch: refetchStatus } = useFaucetStatus();
  const { mutateAsync: claim, isPending: airdropping } = useFaucetClaim();

  const amountSol = status ? status.amountLamports / 1_000_000_000 : 2;
  const walletStatus = status?.wallets?.[walletType];
  const nextAt = walletStatus?.nextAvailableAt ? new Date(walletStatus.nextAvailableAt) : null;

  // Re-render every 30s so the countdown stays roughly accurate without refetching.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!nextAt) return;
    const id = setInterval(() => forceTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [nextAt?.getTime()]);

  const cooldownLabel = formatCountdown(nextAt);
  const canClaim = !!walletAddress && !cooldownLabel && !airdropping;

  const handleAirdrop = async () => {
    if (!walletAddress) {
      Alert.alert('Airdrop failed', 'No wallet address available.');
      return;
    }
    try {
      await claim({ wallet: walletAddress, walletType });
      Alert.alert('Airdrop', `${amountSol} SOL received!`);
      refetchStatus();
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        const serverNext = err?.data?.nextAvailableAt
          ? new Date(err.data.nextAvailableAt)
          : null;
        const label = serverNext ? formatCountdown(serverNext) : cooldownLabel;
        refetchStatus();
        Alert.alert(
          'Faucet cooldown',
          label
            ? `You already claimed on this wallet. Available in ${label}.`
            : 'You already claimed on this wallet. Try again later.'
        );
      } else if (status === 503) {
        Alert.alert('Faucet unavailable', 'The faucet is temporarily out of funds. Please try again later.');
      } else if (status === 502) {
        Alert.alert('Transfer failed', 'The on-chain transfer failed. Please try again.');
      } else if (status === 403) {
        Alert.alert('Not allowed', 'This wallet does not belong to your account.');
      } else if (status === 400) {
        Alert.alert('Invalid request', 'Something is wrong with the request. Please retry.');
      } else if (status === 401) {
        Alert.alert('Session expired', 'Please sign in again.');
      } else {
        Alert.alert('Airdrop failed', 'Please try again later.');
      }
    }
  };

  const handleCopy = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrCode = useMemo(() => {
    if (!walletAddress) return null;
    return (
      <QRCode
        value={walletAddress}
        size={200}
        color="white"
        backgroundColor="#000000"
        ecl="L"
      />
    );
  }, [walletAddress]);

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
          <Text style={styles.headerTitle}>Add Funds</Text>
        </View>

        <View style={styles.content}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Scan QR Code</Text>
            <View style={styles.qrContainer}>
              {qrCode || (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>Loading...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Wallet Address Section */}
          <View style={styles.addressSection}>
            <Text style={styles.infoText}>
              Solana Devnet Network
            </Text>
            <TouchableOpacity
              style={styles.addressButton}
              onPress={handleCopy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Copy wallet address"
            >
              <Text style={styles.addressButtonText} numberOfLines={1} ellipsizeMode="middle">
                {copied ? 'Copied!' : (walletAddress || 'Loading...')}
              </Text>
              <CopyIcon width={18} height={18} />
            </TouchableOpacity>
          </View>

          {/* Devnet Airdrop */}
          <TouchableOpacity
            style={[styles.airdropButton, !canClaim && styles.airdropButtonDisabled]}
            onPress={handleAirdrop}
            disabled={!canClaim}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              cooldownLabel
                ? `Airdrop available in ${cooldownLabel}`
                : `Airdrop ${amountSol} SOL on devnet`
            }
          >
            {airdropping ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.airdropButtonText}>
                {cooldownLabel
                  ? `Available in ${cooldownLabel}`
                  : `Airdrop ${amountSol} SOL (Devnet)`}
              </Text>
            )}
          </TouchableOpacity>

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
    paddingTop: 16,
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
    fontWeight: 'normal',
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  qrTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  addressSection: {
    marginBottom: 40,
    paddingHorizontal: 0,
  },
  addressButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  addressButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    flex: 1,
    marginRight: 12,
  },
  copyIcon: {
    width: 24,
    height: 24,
    tintColor: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 12,
  },
  airdropButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  airdropButtonDisabled: {
    opacity: 0.5,
  },
  airdropButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  claimsSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  claimsTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
  },
  claimsSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
  claimsEmpty: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    paddingVertical: 24,
  },
  claimCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  claimAmount: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
  claimSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginTop: 2,
  },
  claimButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
});