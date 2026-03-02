import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import ComebackIcon from '../../assets/buttons/comeback.svg';
import type { SendScreenProps } from '../../types';

interface DepositPrivateCashProps extends SendScreenProps {
  walletType?: 'cash' | 'privacy';
}

export default function DepositPrivateCash({ onBack, walletType = 'cash' }: DepositPrivateCashProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ComebackIcon width={20} height={16} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Private Cash Deposit</Text>
          <Text style={styles.subtitle}>
            {walletType === 'cash' ? 'Cash → Privacy' : 'Privacy → Cash'}
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
          <Text style={styles.description}>
            Private cash deposits will be available once the Umbra Privacy Protocol launches on mainnet.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 32,
    textAlign: 'center',
  },
  comingSoonBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 24,
  },
  comingSoonText: {
    color: 'rgba(240, 235, 220, 0.95)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
