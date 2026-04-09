import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SendIcon from '../../assets/buttons/send.svg';
import ArrowUpRightIcon from '../../assets/buttons/arrow-up-right-24px.svg';
import ArrowSwitchIcon from '../../assets/buttons/moove.svg';

export default function TransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Grabber */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ alignItems: 'center', paddingBottom: 12 }}
        >
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ color: '#f1ece1', fontSize: 24, fontFamily: 'Sansation-Bold', marginBottom: 24 }}>
          Transfer
        </Text>

        {/* Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>

          {/* Bank Transfer — coming soon */}
          <TouchableOpacity
            onPress={() => Alert.alert('Coming Soon', 'Bank transfers will be available soon.')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Bank transfer"
            style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              padding: 18,
              minHeight: 140,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 4 }}>Bank Transfer</Text>
              <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>To any bank account</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>$</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Sansation-Bold' }}>Soon</Text>
              </View>
            </View>
          </TouchableOpacity>



          {/* Send from Cash Wallet — cream */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)/send?walletType=cash')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Send from bank wallet"
            style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: '#f1ece1',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 18,
              minHeight: 140,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#000100', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 4 }}>Bank Wallet</Text>
              <Text style={{ color: 'rgba(0,1,0,0.5)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Public transfer</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                <ArrowUpRightIcon width={14} height={14} color="#000100" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Private Transfer — gray */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)/send-private')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Private transfer"
            style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 18,
              minHeight: 140,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#f1ece1', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 4 }}>Private Transfer</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Via Umbra Privacy</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                <SendIcon width={14} height={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Send from Stealth Wallet — cream */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)/send?walletType=stealf')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Send from stealth wallet"
            style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: '#f1ece1',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 18,
              minHeight: 140,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#000100', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 4 }}>Stealth Wallet</Text>
              <Text style={{ color: 'rgba(0,1,0,0.5)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Public transfer</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                <ArrowUpRightIcon width={14} height={14} color="#000100" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Move between wallets — gray */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)/moove?direction=toPrivacy')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Move between wallets"
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <ArrowSwitchIcon width={14} height={14} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f1ece1', fontSize: 16, fontFamily: 'Sansation-Bold', marginBottom: 2 }}>Move</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Sansation-Regular' }}>Move your funds both wallets privately</Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
      </LinearGradient>
    </View>
  );
}
