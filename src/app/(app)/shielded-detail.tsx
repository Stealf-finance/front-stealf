import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useShieldedBalance } from '../../hooks/wallet/useShieldedBalance';
import { usePendingClaims } from '../../hooks/wallet/usePendingClaims';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import TabBottomIcon from '../../assets/buttons/received.svg';
import ArrowIcon from '../../assets/buttons/arrow.svg';
import ChevronDown from '../../assets/buttons/chevron-down.svg';
import ShieldIcon from '../../assets/buttons/shield.svg';
import HiddenIcon from '../../assets/buttons/hidden.svg';
import CloseIcon from '../../assets/buttons/close.svg';

export default function ShieldedDetailScreen({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const handleClose = onClose || (() => {
    if (router.canGoBack()) router.back();
  });
  const insets = useSafeAreaInsets();

  const [showManageOptions, setShowManageOptions] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);

  const animateAndSetManage = useCallback((val: boolean) => {
    setShowManageOptions(val);
  }, []);

  const animateAndSetSend = useCallback((val: boolean) => {
    setShowSendOptions(val);
  }, []);

  const { userData } = useAuth();
  const { tokens } = useWalletInfos(userData?.stealf_wallet || '');
  const solToken = tokens.find((t) => t.tokenMint === null);
  const solPrice = solToken && solToken.balance > 0 ? solToken.balanceUSD / solToken.balance : 0;

  const { data: shielded } = useShieldedBalance();
  const shieldedSol = shielded?.sol ?? 0;
  const shieldedBalance = shieldedSol * solPrice;
  const shieldedAssets: { symbol: string; balance: number; balanceUSD: number }[] = shieldedSol > 0
    ? [{ symbol: 'SOL', balance: shieldedSol, balanceUSD: shieldedSol * solPrice }]
    : [];
  const investmentBalance = 0;

  const { data: pendingClaims } = usePendingClaims();
  const pendingCount = pendingClaims?.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Transparent top — navbar visible behind */}
      <View style={{ height: insets.top + 40 }} />

      {/* Sheet */}
      <View style={{ flex: 1, backgroundColor: '#000', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Sansation-Bold', flex: 1 }}>
              Shielded Pool
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
            Encrypted Balance
          </Text>
          <Text style={{ color: '#fff', fontSize: 42, fontFamily: 'Sansation-Light', fontVariant: ['tabular-nums'], marginBottom: 28 }}>
            ${(shieldedBalance + investmentBalance).toFixed(2)}
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => router.push('/(app)/receive-private')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Receive crypto${pendingCount > 0 ? `, ${pendingCount} pending claims` : ''}`}
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
              <TabBottomIcon width={16} height={16} color="#000100" />
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Sansation-Bold', marginTop: 6 }}>Receive</Text>
              {pendingCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 5,
                    borderRadius: 9,
                    backgroundColor: '#ff3b30',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Sansation-Bold', lineHeight: 13 }}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              )}
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
                  <Image
                    source={token.symbol === 'SOL' ? require('../../assets/solana.png') : undefined}
                    style={{ width: 38, height: 38, borderRadius: 19, marginRight: 14 }}
                  />
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
              backgroundColor: 'rgba(255,255,255,0.08)',
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

      {/* Bottom Bar */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 40,
        paddingBottom: insets.bottom + 20,
        paddingTop: 12,
        gap: 10,
      }}>
        {/* Main buttons */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          {showManageOptions ? (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ width: '47%', gap: 10 }}>
              <TouchableOpacity
                onPress={() => animateAndSetManage(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close manage options"
                style={{ alignSelf: 'flex-start', padding: 4, marginBottom: -4 }}
              >
                <CloseIcon width={16} height={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { animateAndSetManage(false); router.push('/(app)/shield'); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Shield assets"
                style={{
                  backgroundColor: '#f1ece1',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Deposit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { animateAndSetManage(false); router.push('/(app)/unshield'); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Unshield assets"
                style={{
                  backgroundColor: '#f1ece1',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Withdraw</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ width: '47%' }}>
              <TouchableOpacity
                onPress={() => { animateAndSetSend(false); animateAndSetManage(true); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Manage assets"
                style={{
                  backgroundColor: '#f1ece1',
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
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Manage</Text>
                <ShieldIcon width={18} height={18} color="#000100" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {showSendOptions ? (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ width: '47%', gap: 10 }}>
              <TouchableOpacity
                onPress={() => animateAndSetSend(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close send options"
                style={{ alignSelf: 'flex-start', padding: 4, marginBottom: -4 }}
              >
                <CloseIcon width={16} height={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { animateAndSetSend(false); router.push('/(app)/moove?direction=toPublic'); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Move to public wallet"
                style={{
                  backgroundColor: '#f1ece1',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Move</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { animateAndSetSend(false); router.push('/(app)/send-private'); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send to external wallet"
                style={{
                  backgroundColor: '#f1ece1',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>External</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ width: '47%' }}>
              <TouchableOpacity
                onPress={() => { animateAndSetManage(false); animateAndSetSend(true); }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Private transfer"
                style={{
                  backgroundColor: '#f1ece1',
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
                <Text style={{ color: '#000100', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Send</Text>
                <HiddenIcon width={18} height={18} color="#000100" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}
