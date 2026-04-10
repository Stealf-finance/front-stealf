import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePendingClaimsForCash } from '../../hooks/wallet/usePendingClaimsForCash';

export default function ReceiveSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: pendingClaims } = usePendingClaimsForCash();
  const pendingCount = pendingClaims?.length ?? 0;

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
            Receive funds
          </Text>

          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 24 }}>
            Choose how you want to receive
          </Text>

          {/* Options */}
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace('/(app)/add-funds')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Receive stablecoins"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: '#f1ece1', fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Receive stablecoins</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' }}>Receive from a wallet address</Text>
              </View>
              <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(app)/receive-cash')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Pending claims${pendingCount > 0 ? `, ${pendingCount}` : ''}`}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: '#f1ece1', fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Pending claims</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' }}>Receive private transfers</Text>
              </View>
              {pendingCount > 0 && (
                <View style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#ff3b30',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 7,
                  marginLeft: 8,
                }}>
                  <Text style={{ color: '#f1ece1', fontSize: 12, fontFamily: 'Sansation-Bold' }}>{pendingCount}</Text>
                </View>
              )}
              <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>›</Text>
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Receive Bank Transfer</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Sansation-Regular' }}>Receive from a bank account</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Sansation-Bold' }}>Soon</Text>
              </View>
            </View>
      </View>
    </ScrollView>
  );
}
