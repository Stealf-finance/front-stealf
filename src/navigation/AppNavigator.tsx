import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import AuthScreen from '../screens/Auth';
import HomeScreen from '../screens/HomeScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import SendScreen from '../screens/Send';
import SendPrivateScreen from '../screens/SendPrivate';
import AddFundsScreen from '../screens/AddFunds';
import AddFundsPrivacyScreen from '../screens/AddFundsPrivacy';
import ProfileScreen from '../screens/Profile';
import { useAuth } from '../contexts/AuthContext';
import { animatePageTransition, animateScreenTransition, animateSlideIn, animateSlideOut } from '../utils/animations';
import type { PageType } from './types';
import { Image } from 'react-native';

export default function AppNavigator() {
  const { isAuthenticated, userData, logout, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'send' | 'sendPrivate' | 'addFunds' | 'addFundsPrivacy'>('main');
  const [showProfile, setShowProfile] = useState(false);
  const [isCardScreenOpen, setIsCardScreenOpen] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenSlideAnim = useRef(new Animated.Value(0)).current;
  const profileFadeAnim = useRef(new Animated.Value(0)).current;
  const profileSlideAnim = useRef(new Animated.Value(100)).current;
  const gradientOpacity = useRef(new Animated.Value(0)).current;

  // Animate gradient transition
  useEffect(() => {
    // Le gradient est en mode privacy si on est sur privacy ET que le profil n'est pas ouvert
    // OU si on vient de cliquer sur privacy depuis le profil (currentPage === 'privacy' même si showProfile est encore true)
    const shouldShowPrivacyGradient = (currentPage === 'privacy' || currentScreen === 'sendPrivate' || currentScreen === 'addFundsPrivacy');

    Animated.timing(gradientOpacity, {
      toValue: shouldShowPrivacyGradient ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentPage, currentScreen]);

  const handleNavigateToPage = (page: PageType) => {
    // Si le profil est ouvert, le fermer d'abord
    if (showProfile) {
      handleCloseProfile();
    }

    // Animation fluide
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(page);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleOpenScreen = (screen: 'send' | 'sendPrivate' | 'addFunds' | 'addFundsPrivacy') => {
    animateScreenTransition(screenFadeAnim, screenSlideAnim, () => setCurrentScreen(screen));
  };

  const handleBackToMain = () => {
    animateScreenTransition(screenFadeAnim, screenSlideAnim, () => setCurrentScreen('main'));
  };

  const handleOpenProfile = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowProfile(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleCloseProfile = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowProfile(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLogout = async () => {
    await logout();
    setShowProfile(false);
    setCurrentPage('home');
    setCurrentScreen('main');
  };

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('../../assets/logo-transparent.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <View style={styles.backgroundContainer}>
      {/* Public Mode Gradient */}
      <View style={styles.gradientContainer}>
        <LinearGradient
          colors={['#000000', '#0a0a0a', '#1a1a1a']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        />
      </View>

      {/* Privacy Mode Gradient - Overlay */}
      <Animated.View
        style={[
          styles.gradientContainer,
          {
            opacity: gradientOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={['#050008', '#0a0510', '#0f0a18']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        />
      </Animated.View>

      <StatusBar style="light" />

      {/* Fixed Navigation Bar */}
      {currentScreen === 'main' && !showProfile && !isCardScreenOpen && (
        <View style={styles.fixedNavigation}>
          <NavigationBar
            currentPage={currentPage}
            onNavigateToPage={handleNavigateToPage}
            onOpenProfile={handleOpenProfile}
            userEmail={userData?.email}
            username={userData?.username}
          />
        </View>
      )}

      {/* Fixed Navigation Bar for Profile */}
      {showProfile && (
        <View style={styles.fixedNavigation}>
          <NavigationBar
            currentPage="profile"
            onNavigateToPage={(page) => {
              handleCloseProfile();
              handleNavigateToPage(page);
            }}
            onOpenProfile={handleCloseProfile}
            userEmail={userData?.email}
            username={userData?.username}
          />
        </View>
      )}

      {/* Main Content - Always rendered */}
      <Animated.View
        style={[
          styles.mainContainer,
          {
            opacity: showProfile ? 0 : fadeAnim,
            zIndex: 3,
          },
        ]}
      >
        {currentScreen === 'main' && (
          <View style={styles.pageContainer}>
            {/* Home Screen - Always mounted */}
            <Animated.View
              style={[
                styles.absolutePage,
                {
                  opacity: currentPage === 'home' ? fadeAnim : 0,
                  zIndex: currentPage === 'home' ? 2 : 1,
                },
              ]}
              pointerEvents={currentPage === 'home' ? 'auto' : 'none'}
            >
              <HomeScreen
                onNavigateToPage={handleNavigateToPage}
                onOpenSend={() => handleOpenScreen('send')}
                onOpenAddFunds={() => handleOpenScreen('addFunds')}
                onOpenProfile={handleOpenProfile}
                onCardScreenChange={setIsCardScreenOpen}
                userEmail={userData?.email}
                username={userData?.username}
              />
            </Animated.View>

            {/* Privacy Screen - Always mounted */}
            <Animated.View
              style={[
                styles.absolutePage,
                {
                  opacity: currentPage === 'privacy' ? fadeAnim : 0,
                  zIndex: currentPage === 'privacy' ? 2 : 1,
                },
              ]}
              pointerEvents={currentPage === 'privacy' ? 'auto' : 'none'}
            >
              <PrivacyScreen
                onNavigateToPage={handleNavigateToPage}
                onOpenSendPrivate={() => handleOpenScreen('sendPrivate')}
                onOpenAddFundsPrivacy={() => handleOpenScreen('addFundsPrivacy')}
                onOpenProfile={handleOpenProfile}
                userEmail={userData?.email}
                username={userData?.username}
              />
            </Animated.View>

            {/* Transaction History - Conditional */}
            {currentPage === 'transactionHistory' && (
              <Animated.View
                style={[
                  styles.absolutePage,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                    zIndex: 3,
                  },
                ]}
              >
                <TransactionHistoryScreen
                  onClose={() => handleNavigateToPage('home')}
                />
              </Animated.View>
            )}
          </View>
        )}

        {currentScreen === 'send' && <SendScreen onBack={handleBackToMain} />}
        {currentScreen === 'sendPrivate' && <SendPrivateScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFunds' && <AddFundsScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFundsPrivacy' && <AddFundsPrivacyScreen onBack={handleBackToMain} />}
      </Animated.View>

      {/* Profile Screen - Always mounted, absolute overlay */}
      <Animated.View
        style={[
          styles.profileContainer,
          {
            opacity: showProfile ? fadeAnim : 0,
            zIndex: showProfile ? 10 : -1,
          },
        ]}
        pointerEvents={showProfile ? 'auto' : 'none'}
      >
        <ProfileScreen
          onBack={handleCloseProfile}
          onNavigateToPage={handleNavigateToPage}
          onLogout={handleLogout}
          currentPage={currentPage}
          userEmail={userData?.email}
          username={userData?.username}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fixedNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  mainContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  absolutePage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    overflow: 'hidden',
  },
  profileContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 150,
    height: 150,
  },
});
