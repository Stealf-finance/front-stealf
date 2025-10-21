import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface NavigationBarProps {
  currentPage: 'home' | 'privacy' | 'profile';
  onNavigateToPage: (page: 'home' | 'privacy') => void;
  onOpenProfile: () => void;
  userEmail?: string;
  username?: string;
}

export default function NavigationBar({
  currentPage,
  onNavigateToPage,
  onOpenProfile,
  userEmail,
  username,
}: NavigationBarProps) {
  const isPrivacy = currentPage === 'privacy';
  const isProfile = currentPage === 'profile';

  return (
    <View style={styles.header}>
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.8}
          onPress={() => onNavigateToPage('home')}
        >
          <Text style={[styles.navButtonText, currentPage === 'home' && styles.navButtonTextActive]}>
            CASH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.8}
          onPress={() => onNavigateToPage('privacy')}
        >
          <Text style={[styles.navButtonText, currentPage === 'privacy' && styles.navButtonTextActive]}>
            PRIVACY
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={onOpenProfile}>
        <View style={[
          styles.profileContainer,
          isPrivacy && styles.profileContainerPrivacy,
          isProfile && styles.profileContainerActive
        ]}>
          <Text style={[styles.profileText, isProfile && styles.profileTextActive]}>
            {username ? username.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 2,
  },
  navButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  navButtonTextActive: {
    color: 'rgba(255, 255, 255, 1)',
  },
  profileContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileContainerPrivacy: {
    backgroundColor: 'rgba(15, 10, 25, 0.8)',
  },
  profileContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  profileText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  profileTextActive: {
    color: 'rgba(0, 0, 0, 0.8)',
  },
});
