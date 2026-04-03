import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReceiveSelectScreen() {
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

        {/* Title */}
        <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Sansation-Bold', paddingHorizontal: 24, marginTop: 16, marginBottom: 28 }}>
          Receive funds
        </Text>

        {/* Options */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={() => { router.back(); setTimeout(() => router.push('/(app)/add-funds'), 100); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Receive stablecoins"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#fff', fontFamily: 'Sansation-Regular', marginBottom: 2 }}>Receive stablecoins</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' }}>Receive from a wallet address</Text>
            </View>
            <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.2)', marginLeft: 12 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled
            activeOpacity={1}
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: 0.5,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#fff', fontFamily: 'Sansation-Regular', marginBottom: 2 }}>Receive Bank Transfer</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Sansation-Regular' }}>Receive from a bank account</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(240,235,220,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 8 }}>
              <Text style={{ fontSize: 11, color: 'rgba(240,235,220,0.95)', fontFamily: 'Sansation-Regular', fontWeight: '600' }}>Coming Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}
