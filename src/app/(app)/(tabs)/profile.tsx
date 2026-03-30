import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useAuthenticatedApi } from '../../../services/api/clientStealf';
import { usePager } from '../../../navigation/PagerContext';

export default function ProfileScreen() {
  const { userData, setUserData, logout } = useAuth();
  const api = useAuthenticatedApi();
  const { currentPage, navigateToPage } = usePager();

  const userEmail = userData?.email;
  const username = userData?.username;

  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  const handleLogout = async () => {
    try {
      setUserData(null);
      await logout();
      navigateToPage('home');
    } catch (error) {
      if (__DEV__) console.error('Error logging out:', error);
      await logout();
      navigateToPage('home');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.del('/api/users/account');
            await logout();
            navigateToPage('home');
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete account');
          }
        }},
      ]
    );
  };

  const handleOpenDocumentation = async () => {
    const url = 'https://stealf-1.gitbook.io/stealf-docs/';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  const handleOpenTelegramBot = async () => {
    const url = 'https://t.me/stealf_bot';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {username && <Text style={styles.username}>@{username}</Text>}
          <Text style={styles.userEmail}>{userEmail || 'No email provided'}</Text>
        </View>

        {/* Points */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsLeft}>
            <Text style={styles.pointsLabel}>Stealf Points</Text>
            <Text style={styles.pointsValue}>✦ {userData?.points ?? 0}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>General</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleOpenDocumentation} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
            <Text style={styles.menuTitle}>Documentation</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleOpenTelegramBot} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
            <Text style={styles.menuTitle}>Help</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
            <Text style={styles.menuTitle}>Logout</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,100,100,0.7)" />
            </View>
            <Text style={[styles.menuTitle, styles.menuTitleDanger]}>Delete my account</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Image
            source={require('../../../assets/logo/logo-transparent.png')}
            style={styles.brandLogo}
            contentFit="contain"
            transition={200}
          />
          <Text style={styles.brandText}>STEALF</Text>
          <Text style={styles.versionText}>Version 0.1</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
  },
  username: {
    fontSize: 22,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.4)',
  },

  // Points
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 28,
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLabel: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  pointsValue: {
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
    color: '#ffffff',
  },

  // Menu
  menuSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff',
  },
  menuTitleDanger: {
    color: 'rgba(255,100,100,0.8)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  brandLogo: {
    width: 32,
    height: 32,
    marginBottom: 6,
  },
  brandText: {
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255,255,255,0.15)',
  },
});
