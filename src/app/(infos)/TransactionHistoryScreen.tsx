import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TransactionHistory from '../../components/TransactionHistory';
import ComebackIcon from '../../assets/buttons/comeback.svg';

interface TransactionHistoryScreenProps {
  onClose: () => void;
  walletType?: 'cash' | 'privacy';
}

export default function TransactionHistoryScreen({ onClose, walletType = 'cash' }: TransactionHistoryScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ComebackIcon width={18} height={18} />
        </TouchableOpacity>
        <Text style={styles.title}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <TransactionHistory limit={50} walletType={walletType} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIcon: {
    fontSize: 24,
    color: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
