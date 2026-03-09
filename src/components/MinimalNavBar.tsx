import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import type { PageType } from '../navigation/types';


interface MinimalNavBarProps {
  onOpenProfile: () => void;
  onNavigateToPage: (page: PageType) => void;
  currentPage: PageType;
  username?: string;
}

export default function MinimalNavBar({
  onOpenProfile,
  onNavigateToPage,
  currentPage,
  username
}: MinimalNavBarProps) {
  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      {/* Cash (Home) */}
      <TouchableOpacity
        onPress={() => onNavigateToPage('home')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.navText,
          currentPage === 'home' && styles.navTextActive
        ]}>
          Cash
        </Text>
      </TouchableOpacity>

      {/* Wealth (Privacy) */}
      <TouchableOpacity
        onPress={() => onNavigateToPage('privacy')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.navText,
          currentPage === 'privacy' && styles.navTextActive
        ]}>
          Stealth
        </Text>
      </TouchableOpacity>

      {/* Profile Circle with Initial */}
      <TouchableOpacity
        style={[
          styles.profileCircle,
          currentPage === 'profile' && styles.profileCircleActive
        ]}
        onPress={onOpenProfile}
        activeOpacity={0.7}
      >
        <Text style={styles.profileInitial}>{initial}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 20,
  },
  navText: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  navTextActive: {
    color: 'rgba(255, 255, 255, 1)',
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  profileCircleActive: {
    backgroundColor: '#FFFFFF',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    fontFamily: 'Sansation-Bold',
  },
});
