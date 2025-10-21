import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface CopyableFieldProps {
  label: string;
  value: string;
}

export default function CopyableField({ label, value }: CopyableFieldProps) {
  const handleCopy = () => {
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.valueContainer} onPress={handleCopy} activeOpacity={0.8}>
        <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
        <Text style={styles.copyIcon}>📋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  value: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    flex: 1,
    marginRight: 8,
  },
  copyIcon: {
    fontSize: 16,
  },
});