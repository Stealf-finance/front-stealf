import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MooveIcon from '../../assets/buttons/moove.svg';
import SendIcon from '../../assets/buttons/send.svg';
import DepositIcon from '../../assets/buttons/deposit.svg';
import ArrowIcon from '../../assets/buttons/arrow.svg';
import UnshieldIcon from '../../assets/buttons/unshield.svg';
import ChevronDown from '../../assets/buttons/chevron-down.svg';

export default function ShieldedDetailScreen({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const handleClose = onClose || (() => {
    if (router.canGoBack()) router.back();
  });
  const insets = useSafeAreaInsets();

  // TODO: hook into Umbra SDK for real balances
  const shieldedBalance = 0;
  const shieldedAssets: { symbol: string; balance: number; balanceUSD: number }[] = [];
  const investmentBalance = 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Transparent top — navbar visible behind */}
      <View style={{ height: insets.top + 70 }} />

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: '#000', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Sansation-Bold', flex: 1 }}>
              Shielded
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
            Protected assets & private investments
          </Text>

          {/* Balance */}
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 4 }}>
            Shielded Balance
          </Text>
          <Text style={{ color: '#fff', fontSize: 42, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 28 }}>
            ${(shieldedBalance + investmentBalance).toFixed(2)}
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => router.push('/(app)/add-funds?wallet=stealf')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Receive crypto"
              style={{
                flex: 1,
                minWidth: '22%',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <DepositIcon width={16} height={16} />
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Receive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Swap will be available soon.')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Swap crypto"
              style={{
                flex: 1,
                minWidth: '22%',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <ArrowIcon width={16} height={16} style={{ opacity: 0.35 }} />
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Swap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Unshield will be available soon.')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Unshield assets"
              style={{
                flex: 1,
                minWidth: '22%',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <UnshieldIcon width={16} height={16} />
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Unshield</Text>
            </TouchableOpacity>

          </View>

          {/* Shielded Assets */}
          <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 14 }}>
            Assets
          </Text>
          {shieldedAssets.length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 28 }}>
              No shielded assets yet
            </Text>
          ) : (
            <View style={{ marginBottom: 28 }}>
              {shieldedAssets.map((token, i) => (
                <View
                  key={token.symbol + i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: i < shieldedAssets.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Sansation-Bold' }}>
                      {token.symbol.slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>
                      {token.symbol}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>
                      {token.balance.toFixed(4)}
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', fontVariant: ['tabular-nums'] }}>
                    ${token.balanceUSD.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Private Investments */}
          <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 14 }}>
            Private Investments
          </Text>

          {/* Jito SOL */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/saving-dashboard')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Jito SOL yield"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Jito SOL</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Up to 6% APY</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', fontVariant: ['tabular-nums'], marginRight: 8 }}>
              ${investmentBalance.toFixed(2)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          {/* S&P 500 — coming soon */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>S&P 500</Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Tokenized index exposure</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Sansation-Bold' }}>Soon</Text>
            </View>
          </View>

          {/* Gold — coming soon */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Gold</Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Tokenized gold exposure</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Sansation-Bold' }}>Soon</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
