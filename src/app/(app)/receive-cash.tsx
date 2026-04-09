import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingClaimsForCash } from '../../hooks/wallet/usePendingClaimsForCash';
import { useUmbra, UmbraError } from '../../hooks/transactions/useUmbra';
import { useAuth } from '../../contexts/AuthContext';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';

function getUtxoAmountLabel(utxo: any): string {
  try {
    const raw = BigInt(utxo.amount as bigint);
    const sol = Number(raw) / LAMPORTS_PER_SOL;
    return `${sol.toFixed(4)} SOL`;
  } catch {
    return '—';
  }
}

export default function ReceiveCashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const { data: claims, isLoading } = usePendingClaimsForCash();
  const { claimSelfToPublic, loading: claimingLoading } = useUmbra();
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

  const handleClaim = async (utxo: any, index: number) => {
    setClaimingIndex(index);
    try {
      await claimSelfToPublic([utxo]);

      const tree = utxo?.treeIndex?.toString?.() ?? '';
      const leaf = utxo?.insertionIndex?.toString?.() ?? '';
      const claimedKey = `${tree}:${leaf}`;
      queryClient.setQueriesData<any[]>({ queryKey: ['pending-claims-cash'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((u) => {
          const t = u?.treeIndex?.toString?.() ?? '';
          const l = u?.insertionIndex?.toString?.() ?? '';
          return `${t}:${l}` !== claimedKey;
        });
      });

      queryClient.invalidateQueries({ queryKey: ['pending-claims-cash'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', userData?.cash_wallet] });

      Alert.alert('Claimed', 'Funds have been added to your cash wallet.');
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
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000' }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Custom grabber */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </View>

      {/* Header */}
      <Text style={{ color: '#f1ece1', fontSize: 24, fontFamily: 'Sansation-Bold', marginBottom: 6 }}>
        Pending Claims
      </Text>

          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 24 }}>
            Private transfers waiting to be received in your cash wallet
          </Text>

          {/* Content */}
          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular', marginTop: 12 }}>
                Scanning the mixer…
              </Text>
            </View>
          ) : !claims || claims.length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: 'Sansation-Regular', textAlign: 'center', paddingVertical: 40 }}>
              No pending transactions to claim.
            </Text>
          ) : (
            claims.map((utxo, i) => {
              const isClaimingThis = claimingIndex === i && claimingLoading;
              return (
                <View
                  key={`${utxo?.treeIndex ?? 0}-${utxo?.insertionIndex ?? i}`}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#f1ece1', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>
                        {getUtxoAmountLabel(utxo)}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>
                        SOL · From private sender
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
            })
          )}
    </ScrollView>
  );
}
