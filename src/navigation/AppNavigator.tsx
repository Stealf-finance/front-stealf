import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import NavigationBar from '../components/NavigationBar';
import MinimalNavBar from '../components/MinimalNavBar';
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
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
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenSlideAnim = useRef(new Animated.Value(0)).current;
  const profileFadeAnim = useRef(new Animated.Value(0)).current;
  const profileSlideAnim = useRef(new Animated.Value(100)).current;

  const handleNavigateToPage = (page: PageType) => {
    // Si le profil est ouvert, le fermer d'abord
    if (showProfile) {
      handleCloseProfile();
    }

    // Determine slide direction
    const pageOrder = ['home', 'privacy', 'transactionHistory'];
    const currentIndex = pageOrder.indexOf(currentPage);
    const nextIndex = pageOrder.indexOf(page);
    const direction = nextIndex > currentIndex ? -1 : 1;

    // Slide animation
    Animated.timing(slideAnim, {
      toValue: direction,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(page);
      slideAnim.setValue(-direction);
      Animated.timing(slideAnim, {
        toValue: 0,
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
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
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
    return authScreen === 'login' ? (
      <LoginScreen
        onSwitchToRegister={() => setAuthScreen('register')}
      />
    ) : (
      <RegisterScreen
        onSwitchToLogin={() => setAuthScreen('login')}
      />
    );
  }

  return (
    <View style={styles.backgroundContainer}>
      {/* Fixed Background Gradient - Changes based on page */}
      <View style={styles.gradientContainer}>
        <Animated.View
          style={[
            styles.background,
            {
              opacity: currentPage === 'home' ? 1 : 0,
            }
          ]}
        >
          <LinearGradient
            colors={['#000000', '#0a0a0a', '#1a1a1a']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.background}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.background,
            {
              opacity: currentPage === 'privacy' ? 1 : 0,
            }
          ]}
        >
          <LinearGradient
            colors={['#050008', '#0d0616', '#15092a']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.background}
          />
        </Animated.View>
      </View>

      <StatusBar style="light" />

      {/* Minimal NavBar - Fixed at top */}
      {currentScreen === 'main' && !showProfile && !isCardScreenOpen && currentPage !== 'transactionHistory' && (
        <View style={styles.fixedNavBar}>
          <MinimalNavBar onOpenProfile={handleOpenProfile} />
        </View>
      )}

      {/* Fixed Page Indicators - Above content */}
      {currentScreen === 'main' && !showProfile && !isCardScreenOpen && currentPage !== 'transactionHistory' && (
        <View style={styles.fixedPageIndicators}>
          <View style={[styles.dot, currentPage === 'home' && styles.dotActive]} />
          <View style={[styles.dot, currentPage === 'privacy' && styles.dotActive]} />
        </View>
      )}

      {/* Main Content - Always rendered */}
      <Animated.View
        style={[
          styles.mainContainer,
          {
            opacity: showProfile ? 0 : 1,
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
                  opacity: currentPage === 'home' ? 1 : 0,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-400, 0, 400],
                      }),
                    },
                  ],
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
                currentPage={currentPage}
              />
            </Animated.View>

            {/* Privacy Screen - Always mounted */}
            <Animated.View
              style={[
                styles.absolutePage,
                {
                  opacity: currentPage === 'privacy' ? 1 : 0,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-400, 0, 400],
                      }),
                    },
                  ],
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
                currentPage={currentPage}
              />
            </Animated.View>

            {/* Transaction History - Conditional */}
            {currentPage === 'transactionHistory' && (
              <Animated.View
                style={[
                  styles.absolutePage,
                  {
                    opacity: 1,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: [-400, 0, 400],
                        }),
                      },
                    ],
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
            opacity: showProfile ? 1 : 0,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fixedNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
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
  fixedPageIndicators: {
    position: 'absolute',
    top: 420,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 1001,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 24,
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
