import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingClaims } from '../../hooks/wallet/usePendingClaims';
import { useUmbra, UmbraError } from '../../hooks/transactions/useUmbra';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';

/** For now we only support SOL deposits → label all UTXOs as SOL. */
function getUtxoMintLabel(): string {
  // TODO: properly decode mintAddressLow + mintAddressHigh into a base58 address once we add multi-asset
  return 'SOL';
}

function getUtxoAmountLabel(utxo: any): string {
  try {
    const raw = BigInt(utxo.amount as bigint);
    const sol = Number(raw) / LAMPORTS_PER_SOL;
    return `${sol.toFixed(4)} SOL`;
  } catch {
    return '—';
  }
}

function getUtxoSenderLabel(): string {
  // sender comes from senderAddressLow + senderAddressHigh (U128 each)
  // TODO: decode into a real base58 address once we want to display the sender
  return 'Private sender';
}

export default function ReceivePrivateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: claims, isLoading, refetch, isRefetching } = usePendingClaims();
  const { claimReceived, loading: claimingLoading } = useUmbra();
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

  const handleClaim = async (utxo: any, index: number) => {
    setClaimingIndex(index);
    try {
      await claimReceived([utxo]);

      // Optimistic update: remove the claimed UTXO from every cached pending-claims
      // entry immediately, so it disappears from the UI without waiting for the
      // indexer to catch up on the next refetch.
      const claimedKey = utxo?.commitmentIndex?.toString();
      queryClient.setQueriesData<any[]>({ queryKey: ['pending-claims'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((u) => u?.commitmentIndex?.toString() !== claimedKey);
      });

      // Then trigger background refetch to reconcile with on-chain state
      queryClient.invalidateQueries({ queryKey: ['pending-claims'] });
      queryClient.invalidateQueries({ queryKey: ['shielded-balance'] });

      Alert.alert('Claimed', 'Funds have been added to your private balance.');
    } catch (err: any) {
      const friendly = err instanceof UmbraError
        ? err.userMessage
        : (err?.message || 'An error occurred');
      Alert.alert('Claim failed', friendly);
    } finally {
      setClaimingIndex(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ flex: 1 }}
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
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Sansation-Bold', marginBottom: 4 }}>
            Pending Claims
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>
            Private transfers waiting to be added to your balance
          </Text>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular', marginTop: 12 }}>
              Scanning the mixer…
            </Text>
          </View>
        ) : !claims || claims.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />}
          >
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: 'Sansation-Regular', textAlign: 'center' }}>
              No pending private transactions to claim.
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />}
          >
            {claims.map((utxo, i) => {
              const isClaimingThis = claimingIndex === i && claimingLoading;
              return (
                <View
                  key={`${utxo.commitmentIndex?.toString() || ''}-${i}`}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>
                        {getUtxoAmountLabel(utxo)}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>
                        {getUtxoMintLabel()} · {getUtxoSenderLabel()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleClaim(utxo, i)}
                    disabled={isClaimingThis}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#f1ece1',
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      opacity: isClaimingThis ? 0.6 : 1,
                    }}
                  >
                    {isClaimingThis ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={{ color: '#000100', fontSize: 15, fontFamily: 'Sansation-Bold' }}>Claim</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}
