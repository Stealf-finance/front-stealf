import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import PointsCard from '../../components/features/PointsCard';
import { usePoints } from '../../hooks/usePoints';

interface ProfileScreenProps {
  onBack?: () => void;
  onNavigateToPage?: (page: string) => void;
  onLogout?: () => void;
  currentPage?: string;
  userEmail?: string;
  username?: string;
}

export default function ProfileScreen({ onBack, onNavigateToPage, onLogout, currentPage, userEmail, username }: ProfileScreenProps) {
  const { setUserData } = useAuth();
  const { points, history } = usePoints();

  const handleLogout = async () => {
    try {
      setUserData(null);
      console.log('User logged out');
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
      if (onLogout) {
        onLogout();
      }
    }
  };

  const handleOpenTelegramBot = async () => {
    const url = 'https://t.me/stealf_bot';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open Telegram. Please install the Telegram app.');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#000000', '#000000']} style={styles.background}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userType}>Personal</Text>
            {username && (
              <Text style={styles.username}>@{username}</Text>
            )}
            <Text style={styles.userEmail}>{userEmail || 'No email provided'}</Text>
          </View>
        </View>

        {/* Profile Content */}
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>

          {/* Rewards card */}
          <PointsCard points={points} history={history} />

          {/* Spacer pour pousser les boutons vers le bas */}
          <View style={{ flex: 1 }} />

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.profileActionButton} activeOpacity={0.8} onPress={handleOpenTelegramBot}>
              <View style={styles.profileActionIcon}>
                <Text style={styles.profileActionIconText}>?</Text>
              </View>
              <View style={styles.profileActionInfo}>
                <Text style={styles.profileActionTitle}>Help</Text>
                <Text style={styles.profileActionSubtitle}>Customer service</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileActionButton} activeOpacity={0.8} onPress={handleLogout}>
              <View style={styles.profileActionIcon}>
                <Text style={styles.profileActionIconText}>←</Text>
              </View>
              <View style={styles.profileActionInfo}>
                <Text style={styles.profileActionTitle}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Spacer pour pousser le footer vers le bas */}
          <View style={{ minHeight: 80 }} />

          {/* Footer */}
          <View style={styles.profileFooter}>
            <Text style={styles.versionText}>Version 0.1</Text>
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/logo-transparent.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>STEALF</Text>
            </View>
          </View>
        </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 10,
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userType: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
    marginBottom: 8,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
  },
  username: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  bottomActions: {
    gap: 20,
    marginBottom: 40,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  profileActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileActionIconText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileActionInfo: {
    flex: 1,
  },
  profileActionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  profileActionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  profileFooter: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  versionText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
    marginBottom: 20,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  brandText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
});
