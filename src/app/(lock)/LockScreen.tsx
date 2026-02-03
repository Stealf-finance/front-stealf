import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/fond.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}>
        <Text style={styles.unlockText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  image: {
    marginTop: '30%',
    width: SCREEN_WIDTH * 0.95,
    height: undefined,
    aspectRatio: 3 / 4,
    borderRadius: 20,
  },
  unlockButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  unlockText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Sansation',
    fontWeight: '700',
  },
});
