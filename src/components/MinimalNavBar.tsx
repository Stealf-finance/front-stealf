import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MinimalNavBarProps {
  onOpenProfile: () => void;
  onOpenNotifications?: () => void;
}

export default function MinimalNavBar({ onOpenProfile, onOpenNotifications }: MinimalNavBarProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo-transparent.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.rightButtons}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={28} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onOpenProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={32} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
  },
  profileButton: {
    padding: 8,
  },
});
