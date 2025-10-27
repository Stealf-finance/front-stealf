import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import NavigationBar from '../components/NavigationBar';
import type { ProfileScreenProps } from '../types';
import { storageService } from '../services';

export default function ProfileScreen({ onBack, onNavigateToPage, onLogout, currentPage, userEmail, username }: ProfileScreenProps) {

  const handleLogout = async () => {
    try {
      await storageService.clearAll();
      console.log('✅ All user data cleared from storage');
      onLogout();
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      onLogout();
    }
  };

  // Pan Responder pour le swipe depuis le profil
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe vers la droite depuis le profil - retour vers Privacy
        onBack();
      }
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Header Spacer */}
        <View style={styles.headerSpacer} />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userType}>Personal</Text>
            <Text style={styles.userEmail}>{userEmail || 'No email provided'}</Text>
            {username && (
              <Text style={styles.username}>{username}</Text>
            )}
          </View>
        </View>

        {/* Profile Content */}
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>

          {/* Action Buttons */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.profileActionButton} activeOpacity={0.8}>
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

            <TouchableOpacity style={styles.profileActionButton} activeOpacity={0.8}>
              <View style={styles.profileActionIcon}>
                <Text style={styles.profileActionIconText}>×</Text>
              </View>
              <View style={styles.profileActionInfo}>
                <Text style={styles.profileActionTitle}>Delete this account</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.profileFooter}>
            <Text style={styles.versionText}>Version 1</Text>
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
  headerSpacer: {
    height: 110,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  profileHeader: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
    marginBottom: 4,
  },
  username: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  totalCashContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  totalCashCard: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: 'rgb(255, 255, 255)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  totalCashLabel: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
  },
  totalCashAmount: {
    color: 'rgba(0, 0, 0, 0.9)',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  profileActions: {
    gap: 20,
    marginTop: 200,
    marginBottom: 60,
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