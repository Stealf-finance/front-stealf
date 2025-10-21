import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PaymentOptionProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function PaymentOption({ title, subtitle, onPress }: PaymentOptionProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  arrow: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});