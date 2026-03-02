import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
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
import { animateScreenTransition } from '../utils/animations';
import type { PageType } from './types';
import { RevolutPager, RevolutPagerRef } from './swipePager';
import { WelcomeLoader } from '../components/WelcomeLoader';
import Logo from '../assets/logo/logo.svg';
import { useWalletInfos } from '../hooks/useWalletInfos';

export default function AppNavigator() {
  const { isAuthenticated, userData, logout, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'send' | 'sendPrivate' | 'moove' | 'addFunds' | 'addFundsPrivacy' | 'depositPrivateCash' | 'info' | 'transactionHistory'>('main');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [depositWalletType, setDepositWalletType] = useState<'cash' | 'privacy'>('cash');
  const [previousPage, setPreviousPage] = useState<PageType>('home');
  const [mooveDirection, setMooveDirection] = useState<'toPrivacy' | 'toCash'>('toCash');
  const [txHistoryWalletType, setTxHistoryWalletType] = useState<'cash' | 'privacy'>('cash');
  const [infoSource, setInfoSource] = useState<'home' | 'privacy'>('home');

  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenSlideAnim = useRef(new Animated.Value(0)).current;

  // Splash overlay — starts opaque, covers everything until app is ready
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');

  // Dismiss splash when auth is resolved + data loaded (or not authenticated)
  useEffect(() => {
    if (loading || splashFading) return;
    if (!isAuthenticated) {
      setSplashVisible(false);
      return;
    }
    if (!isLoadingBalance) {
      const timer = setTimeout(() => setSplashFading(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, isLoadingBalance, splashFading]);

  // Reset splash for next login after logout
  useEffect(() => {
    if (!isAuthenticated) {
      setSplashVisible(true);
      setSplashFading(false);
    }
  }, [isAuthenticated]);

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
    // Sync the pager with the page change
    if (pagerRef.current) {
      pagerRef.current.scrollToIndex(targetIndex);
    }
  };

  const handlePagerIndexChange = (index: number) => {
    const page = getPageFromIndex(index);
    setCurrentPage(page);
  };

  const handleOpenScreen = (screen: 'send' | 'sendPrivate' | 'moove' | 'addFunds' | 'addFundsPrivacy' | 'depositPrivateCash' | 'info' | 'transactionHistory') => {
    setPreviousPage(currentPage);
    animateScreenTransition(screenFadeAnim, screenSlideAnim, () => setCurrentScreen(screen));
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
    animateScreenTransition(screenFadeAnim, screenSlideAnim, () => {
      setCurrentScreen('main');
      handleNavigateToPage(previousPage);
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
    setCurrentScreen('main');
  };

  if (!isAuthenticated && !splashVisible) {
    if (authMode === 'signin') {
      return <SignInScreen onSwitchToSignUp={() => setAuthMode('signup')} />;
    }
    return <SignUpScreen onSwitchToSignIn={() => setAuthMode('signin')} />;
  }

  return (
    <View style={styles.backgroundContainer}>
      <StatusBar style="light" />

      {/* Minimal NavBar - Fixed at top */}
      {currentScreen === 'main' && (
        <View style={styles.fixedNavBar}>
          <MinimalNavBar
            onOpenProfile={handleOpenProfile}
            onNavigateToPage={handleNavigateToPage}
            currentPage={currentPage}
            username={userData?.username}
          />
        </View>
      )}

      {/* Main Content - Always rendered */}
      <View style={styles.mainContainer}>
        {currentScreen === 'main' && (
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
        )}

        {currentScreen === 'send' && <SendScreen onBack={handleBackToMain} />}
        {currentScreen === 'sendPrivate' && <SendPrivateScreen onBack={handleBackToMain} transferType="private" />}
        {currentScreen === 'moove' && <MooveScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFunds' && <AddFundsScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFundsPrivacy' && <AddFundsPrivacyScreen onBack={handleBackToMain} />}
        {currentScreen === 'depositPrivateCash' && <DepositPrivateCashScreen onBack={handleBackToMain} walletType={depositWalletType} />}
        {currentScreen === 'info' && <InfoScreen onBack={handleBackToMain} source={infoSource} />}
        {currentScreen === 'transactionHistory' && <TransactionHistoryScreen onClose={handleBackToMain} walletType={txHistoryWalletType} />}
      </View>

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
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
