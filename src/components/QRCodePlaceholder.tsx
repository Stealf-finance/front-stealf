import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QRCodePlaceholderProps {
  data: string;
  size: number;
}

export default function QRCodePlaceholder({ data, size }: QRCodePlaceholderProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={styles.placeholder}>QR CODE</Text>
      <Text style={styles.subtitle}>Wallet Address</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
});