import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePendingClaimsForCash } from '../../hooks/wallet/usePendingClaimsForCash';
import ChevronDown from '../../assets/buttons/chevron-down.svg';

export default function ReceiveSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: pendingClaims } = usePendingClaimsForCash();
  const pendingCount = pendingClaims?.length ?? 0;

  const handleClose = () => {
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Transparent top — navbar visible behind */}
      <View style={{ height: insets.top + 40 }} />

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: '#000', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Sansation-Bold', flex: 1 }}>
              Receive funds
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ padding: 8 }}
            >
              <ChevronDown width={32} height={32} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 24 }}>
            Choose how you want to receive
          </Text>

          {/* Options */}
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => { router.back(); setTimeout(() => router.push('/(app)/add-funds'), 100); }}
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
                <Text style={{ fontSize: 16, color: '#fff', fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Receive stablecoins</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' }}>Receive from a wallet address</Text>
              </View>
              <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { router.back(); setTimeout(() => router.push('/(app)/receive-cash'), 100); }}
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
                <Text style={{ fontSize: 16, color: '#fff', fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Pending claims</Text>
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
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Sansation-Bold' }}>{pendingCount}</Text>
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
      </View>
    </View>
  );
}
