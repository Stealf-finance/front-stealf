import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MinimalNavBar from '../components/MinimalNavBar';
import SignUpScreen from '../app/(auth)/SignUpScreen';
import SignInScreen from '../app/(auth)/SignInScreen';
import HomeScreen from '../app/(tabs)/HomeScreen';
import PrivacyScreen from '../app/(tabs)/PrivacyScreen';
import SendScreen from '../app/(send)/Send';
import SendPrivateScreen from '../app/(send)/SendPrivate';
import MooveScreen from '../app/(send)/moove';
import AddFundsScreen from '../app/(add)/AddFunds';
import AddFundsPrivacyScreen from '../app/(add)/AddFundsPrivacy';
import DepositPrivateCashScreen from '../app/(deposit)/DepositPrivateCash';
import ProfileScreen from '../app/(tabs)/Profile';
import SavingsScreen from '../app/(savings)/SavingsScreen';
import InfoScreen from '../app/(infos)/InfoScreen';
import TransactionHistoryScreen from '../app/(infos)/TransactionHistoryScreen';
import { useAuth } from '../contexts/AuthContext';
import { animateScreenIn, animateScreenOut } from '../utils/animations';
import type { PageType } from './types';
import { RevolutPager, RevolutPagerRef } from './swipePager';
import { WelcomeLoader } from '../components/WelcomeLoader';
import Logo from '../assets/logo/logo.svg';
import { useWalletInfos } from '../hooks/wallet/useWalletInfos';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type OverlayScreen = 'send' | 'sendPrivate' | 'moove' | 'addFunds' | 'addFundsPrivacy' | 'depositPrivateCash' | 'info' | 'transactionHistory';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type OverlayScreen = 'send' | 'sendPrivate' | 'moove' | 'addFunds' | 'addFundsPrivacy' | 'depositPrivateCash' | 'info' | 'transactionHistory';

export default function AppNavigator() {
  const { isAuthenticated, userData, logout, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [overlayScreen, setOverlayScreen] = useState<OverlayScreen | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [depositWalletType, setDepositWalletType] = useState<'cash' | 'privacy'>('cash');
  const [previousPage, setPreviousPage] = useState<PageType>('home');
  const [mooveDirection, setMooveDirection] = useState<'toPrivacy' | 'toCash'>('toCash');
  const [txHistoryWalletType, setTxHistoryWalletType] = useState<'cash' | 'privacy'>('cash');
  const [infoSource, setInfoSource] = useState<'home' | 'privacy'>('home');

  const overlaySlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Splash overlay — starts opaque, covers everything until app is ready
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');

  const wasAuthenticated = useRef(isAuthenticated);

  // Show splash when user just authenticated (login/signup transition)
  useEffect(() => {
    if (!wasAuthenticated.current && isAuthenticated) {
      // Just logged in — show loading screen while data loads
      setSplashVisible(true);
      setSplashFading(false);
    }
    if (wasAuthenticated.current && !isAuthenticated) {
      // Just logged out — reset for next login
      setSplashVisible(false);
      setSplashFading(false);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // Dismiss splash when auth is resolved + data loaded (or not authenticated)
  useEffect(() => {
    if (loading || splashFading) return;
    if (!isAuthenticated) {
      setSplashVisible(false);
      return;
    }
    if (splashVisible && !isLoadingBalance) {
      const timer = setTimeout(() => setSplashFading(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, isLoadingBalance, splashFading, splashVisible]);

  const handleWelcomeDone = useCallback(() => {
    setSplashVisible(false);
    setSplashFading(false);
  }, []);

  const pageOrder: PageType[] = ['home', 'privacy', 'savings', 'profile'];
  const getPageIndex = (page: PageType) => pageOrder.indexOf(page);
  const getPageFromIndex = (index: number) => pageOrder[index];

  const pagerRef = useRef<RevolutPagerRef>(null);

  const handleNavigateToPage = (page: PageType) => {
    if (page === 'transactionHistory') {
      setTxHistoryWalletType(currentPage === 'privacy' ? 'privacy' : 'cash');
      handleOpenScreen('transactionHistory');
      return;
    }
    const targetIndex = getPageIndex(page);
    setCurrentPage(page);
    if (pagerRef.current) {
      pagerRef.current.scrollToIndex(targetIndex);
    }
  };

  const handlePagerIndexChange = (index: number) => {
    const page = getPageFromIndex(index);
    setCurrentPage(page);
  };

  const handleOpenScreen = (screen: OverlayScreen) => {
    setPreviousPage(currentPage);
    setOverlayScreen(screen);
    animateScreenIn(overlaySlideAnim);
  };

  const handleOpenDepositPrivateCashFromHome = () => {
    setDepositWalletType('cash');
    handleOpenScreen('depositPrivateCash');
  };

  const handleOpenDepositPrivateCashFromPrivacy = () => {
    setDepositWalletType('privacy');
    handleOpenScreen('depositPrivateCash');
  };

  const handleBackToMain = () => {
    animateScreenOut(overlaySlideAnim, () => {
      setOverlayScreen(null);
    });
  };

  const handleOpenProfile = () => {
    handleNavigateToPage('profile');
  };

  const handleOpenInfoFromHome = () => {
    setInfoSource('home');
    handleOpenScreen('info');
  };

  const handleOpenInfoFromPrivacy = () => {
    setInfoSource('privacy');
    handleOpenScreen('info');
  };

  const handleCloseProfile = () => {
    handleNavigateToPage('home');
  };

  const handleLogout = async () => {
    await logout();
    setCurrentPage('home');
    setOverlayScreen(null);
  };

  const handleShowLoader = useCallback(() => {
    setSplashVisible(true);
    setSplashFading(false);
  }, []);

  if (!isAuthenticated && !splashVisible) {
    if (authMode === 'signin') {
      return <SignInScreen onSwitchToSignUp={() => setAuthMode('signup')} onAuthStart={handleShowLoader} />;
    }
    return <SignUpScreen onSwitchToSignIn={() => setAuthMode('signin')} onAuthStart={handleShowLoader} />;
  }

  const renderOverlayScreen = () => {
    switch (overlayScreen) {
      case 'send': return <SendScreen onBack={handleBackToMain} />;
      case 'sendPrivate': return <SendPrivateScreen onBack={handleBackToMain} transferType="private" />;
      case 'moove': return <MooveScreen onBack={handleBackToMain} direction={mooveDirection} />;
      case 'addFunds': return <AddFundsScreen onBack={handleBackToMain} />;
      case 'addFundsPrivacy': return <AddFundsPrivacyScreen onBack={handleBackToMain} />;
      case 'depositPrivateCash': return <DepositPrivateCashScreen onBack={handleBackToMain} />;
      case 'info': return <InfoScreen onBack={handleBackToMain} source={infoSource} />;
      case 'transactionHistory': return <TransactionHistoryScreen onClose={handleBackToMain} walletType={txHistoryWalletType} />;
      default: return null;
    }
  };

  return (
    <View style={styles.backgroundContainer}>
      <StatusBar style="light" />

      {/* Minimal NavBar - Fixed at top */}
      {!overlayScreen && (
        <View style={styles.fixedNavBar}>
          <MinimalNavBar
            onOpenProfile={handleOpenProfile}
            onNavigateToPage={handleNavigateToPage}
            currentPage={currentPage}
            username={userData?.username}
          />
        </View>
      )}

      {/* Main Content - Always rendered behind */}
      <View style={styles.mainContainer}>
        <RevolutPager
          ref={pagerRef}
          initialIndex={getPageIndex(currentPage)}
          pages={[
            {
              key: 'home',
              render: () => (
                <HomeScreen
                  onNavigateToPage={handleNavigateToPage}
                  onOpenAddFunds={() => handleOpenScreen('addFunds')}
                  onOpenSend={() => handleOpenScreen('send')}
                  onOpenMoove={() => { setMooveDirection('toPrivacy'); handleOpenScreen('moove'); }}
                  onOpenDepositPrivateCash={handleOpenDepositPrivateCashFromHome}
                  onOpenProfile={handleOpenProfile}
                  onOpenInfo={handleOpenInfoFromHome}
                  userEmail={userData?.email}
                  username={userData?.username}
                  currentPage={currentPage}
                />
              ),
            },
            {
              key: 'privacy',
              render: () => (
                <PrivacyScreen
                  onNavigateToPage={handleNavigateToPage}
                  onOpenMoove={() => { setMooveDirection('toCash'); handleOpenScreen('moove'); }}
                  onOpenAddFundsPrivacy={() => handleOpenScreen('addFundsPrivacy')}
                  onOpenDepositPrivateCash={handleOpenDepositPrivateCashFromPrivacy}
                  onOpenProfile={handleOpenProfile}
                  onOpenInfo={handleOpenInfoFromPrivacy}
                  userEmail={userData?.email}
                  currentPage={currentPage}
                />
              ),
            },
            {
              key: 'savings',
              render: () => (
                <SavingsScreen />
              ),
            },
            {
              key: 'profile',
              render: () => (
                <ProfileScreen
                  onBack={handleCloseProfile}
                  onNavigateToPage={handleNavigateToPage}
                  onLogout={handleLogout}
                  currentPage={currentPage}
                  userEmail={userData?.email}
                  username={userData?.username}
                />
              ),
            },
          ]}
          onIndexChange={handlePagerIndexChange}
        />
      </View>

      {/* Overlay screen - slides up from bottom */}
      {overlayScreen && (
        <Animated.View
          style={[
            styles.overlayContainer,
            { transform: [{ translateY: overlaySlideAnim }] },
          ]}
        >
          {renderOverlayScreen()}
        </Animated.View>
      )}

      {splashVisible && (
        <View style={styles.welcomeOverlay}>
          <WelcomeLoader
            logo={<Logo width={80} height={80} />}
            startOpaque
            fadeOutTrigger={splashFading}
            onFadeOutEnd={handleWelcomeDone}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  fixedNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  mainContainer: {
    flex: 1,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 500,
  },
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
