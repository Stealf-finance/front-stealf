import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import TransactionHistory from '../../components/TransactionHistory';
import { Image } from 'expo-image';
import TabBottomIcon from '../../assets/buttons/tab-bottom-24px.svg';
import ArrowUpRightIcon from '../../assets/buttons/arrow-up-right-24px.svg';
import ArrowIcon from '../../assets/buttons/arrow.svg';
import BankIcon from '../../assets/buttons/ellipses-horizontal-white-24px.svg';
import ChevronDown from '../../assets/buttons/chevron-down.svg';

export default function WalletDetailScreen({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const handleClose = onClose || (() => {
    if (router.canGoBack()) router.back();
  });
  const insets = useSafeAreaInsets();
  const { userData } = useAuth();
  const { balance, tokens } = useWalletInfos(userData?.stealf_wallet || '');

  const walletBalance = balance ?? 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Transparent top — navbar visible behind */}
      <View style={{ height: insets.top + 70 }} />

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: '#000', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Sansation-Bold', flex: 1 }}>
              Wallet
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
            Send, receive & manage your assets
          </Text>

          {/* Balance */}
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 4 }}>
            Public Balance
          </Text>
          <Text style={{ color: '#fff', fontSize: 42, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 28 }}>
            ${walletBalance.toFixed(2)}
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Swap will be available soon.')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Swap crypto"
              style={{
                flex: 1,
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
              onPress={() => router.push('/(app)/info?source=privacy')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Wallet info"
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <BankIcon width={16} height={16} />
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Infos</Text>
            </TouchableOpacity>
          </View>

          {/* Assets */}
          <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold', marginBottom: 14 }}>
            Assets
          </Text>
          {tokens.filter(t => t.balance > 0).length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Sansation-Regular', marginBottom: 28 }}>
              No assets yet
            </Text>
          ) : (
            <View style={{ marginBottom: 28 }}>
              {tokens.filter(t => t.balance > 0).map((token, i, arr) => (
                <View
                  key={token.tokenMint || i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Image
                    source={token.tokenSymbol === 'SOL' ? require('../../assets/solana.png') : undefined}
                    style={{ width: 38, height: 38, borderRadius: 19, marginRight: 14 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>
                      {token.tokenSymbol}
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

          {/* Transactions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Sansation-Bold' }}>
              Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/transaction-history?walletType=privacy')}
              accessibilityRole="button"
              accessibilityLabel="See all transactions"
            >
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Sansation-Regular' }}>
                See all
              </Text>
            </TouchableOpacity>
          </View>
          <TransactionHistory limit={3} walletType="privacy" />
        </ScrollView>
      </View>

      {/* Bottom Bar */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 40,
        paddingBottom: insets.bottom + 20,
        paddingTop: 12,
        flexDirection: 'row',
        gap: 10,
      }}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/add-funds?wallet=stealf')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Receive"
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            borderCurve: 'continuous',
            paddingVertical: 18,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Receive</Text>
          <TabBottomIcon width={18} height={18} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(app)/send?walletType=stealf')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            borderCurve: 'continuous',
            paddingVertical: 18,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 50,
          }}
        >
          <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Send</Text>
          <ArrowUpRightIcon width={18} height={18} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
