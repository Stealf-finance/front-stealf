import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import TransactionHistory from '../../components/TransactionHistory';

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { walletType = 'cash' } = useLocalSearchParams<{ walletType?: string }>();
  const walletLabel = walletType === 'privacy' ? 'Stealth Wallet' : 'Bank Wallet';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
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

          <Text style={styles.title}>Transaction History</Text>
          <Text style={styles.subtitle}>{walletLabel}</Text>

          <TransactionHistory limit={100} walletType={walletType as 'cash' | 'privacy'} flat />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
});
