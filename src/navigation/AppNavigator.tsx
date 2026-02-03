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
import InfoScreen from '../app/(infos)/InfoScreen';
import TransactionHistoryScreen from '../app/(infos)/TransactionHistoryScreen';
import { useAuth } from '../contexts/AuthContext';
import { animateScreenTransition } from '../utils/animations';
import type { PageType } from './types';
import { Image } from 'react-native';
import { RevolutPager, RevolutPagerRef } from './swipePager';
import { WelcomeLoader } from '../components/WelcomeLoader';
import Logo from '../assets/logo/logo.svg';
import { useWalletInfos } from '../hooks/useWalletInfos';
import LockScreen from '../app/(lock)/LockScreen';

export default function AppNavigator() {
  const { isAuthenticated, userData, logout, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'send' | 'sendPrivate' | 'moove' | 'addFunds' | 'addFundsPrivacy' | 'depositPrivateCash' | 'info' | 'transactionHistory'>('main');
  const [isCardScreenOpen, setIsCardScreenOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [depositWalletType, setDepositWalletType] = useState<'cash' | 'privacy'>('cash');
  const [previousPage, setPreviousPage] = useState<PageType>('home');
  const [transferType, setTransferType] = useState<'basic' | 'private'>('private');
  const [txHistoryWalletType, setTxHistoryWalletType] = useState<'cash' | 'privacy'>('cash');
  const [isLocked, setIsLocked] = useState(false);

  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenSlideAnim = useRef(new Animated.Value(0)).current;

  // Welcome loader: only show when transitioning from non-auth to auth
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeFadeOut, setWelcomeFadeOut] = useState(false);
  const wasAuthenticated = useRef(isAuthenticated);
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      // Just became authenticated, show welcome loader
      setShowWelcome(true);
      setWelcomeFadeOut(false);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (showWelcome && isAuthenticated && !isLoadingBalance) {
      const timer = setTimeout(() => setWelcomeFadeOut(true), 300);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, isAuthenticated, isLoadingBalance]);

  const handleWelcomeDone = useCallback(() => {
    setShowWelcome(false);
    setWelcomeFadeOut(false);
  }, []);

  const pageOrder: PageType[] = ['privacy', 'home', 'profile'];
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

  const handleOpenInfo = () => {
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

  if (isLocked) {
    return (
      <View style={styles.backgroundContainer}>
        <StatusBar style="light" />
        <LockScreen onUnlock={() => setIsLocked(false)} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('../assets/logo-transparent.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authMode === 'signin') {
      return <SignInScreen onSwitchToSignUp={() => setAuthMode('signup')} />;
    }
    return <SignUpScreen onSwitchToSignIn={() => setAuthMode('signin')} />;
  }

  return (
    <View style={styles.backgroundContainer}>
      <StatusBar style="light" />

      {/* Minimal NavBar - Fixed at top */}
      {(currentScreen === 'main' && !isCardScreenOpen) && (
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
                key: 'privacy',
                render: () => (
                  <PrivacyScreen
                    onNavigateToPage={handleNavigateToPage}
                    onOpenSendPrivate={(type: 'basic' | 'private') => {
                      setTransferType(type);
                      handleOpenScreen('sendPrivate');
                    }}
                    onOpenMoove={() => handleOpenScreen('moove')}
                    onOpenAddFundsPrivacy={() => handleOpenScreen('addFundsPrivacy')}
                    onOpenDepositPrivateCash={handleOpenDepositPrivateCashFromPrivacy}
                    onOpenProfile={handleOpenProfile}
                    userEmail={userData?.email}
                    username={userData?.username}
                    currentPage={currentPage}
                  />
                ),
              },
              {
                key: 'home',
                render: () => (
                  <HomeScreen
                    onNavigateToPage={handleNavigateToPage}
                    onOpenAddFunds={() => handleOpenScreen('addFunds')}
                    onOpenSend={() => handleOpenScreen('send')}
                    onOpenDepositPrivateCash={handleOpenDepositPrivateCashFromHome}
                    onOpenProfile={handleOpenProfile}
                    onOpenInfo={handleOpenInfo}
                    userEmail={userData?.email}
                    username={userData?.username}
                    currentPage={currentPage}
                  />
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
        {currentScreen === 'sendPrivate' && <SendPrivateScreen onBack={handleBackToMain} transferType={transferType} />}
        {currentScreen === 'moove' && <MooveScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFunds' && <AddFundsScreen onBack={handleBackToMain} />}
        {currentScreen === 'addFundsPrivacy' && <AddFundsPrivacyScreen onBack={handleBackToMain} />}
        {currentScreen === 'depositPrivateCash' && <DepositPrivateCashScreen onBack={handleBackToMain} walletType={depositWalletType} />}
        {currentScreen === 'info' && <InfoScreen onBack={handleBackToMain} />}
        {currentScreen === 'transactionHistory' && <TransactionHistoryScreen onClose={handleBackToMain} walletType={txHistoryWalletType} />}
      </View>

      {isLocked && (
        <View style={styles.lockOverlay}>
          <LockScreen onUnlock={() => setIsLocked(false)} />
        </View>
      )}

      {showWelcome && (
        <View style={styles.welcomeOverlay}>
          <WelcomeLoader
            logo={<Logo width={80} height={80} />}
            fadeOutTrigger={welcomeFadeOut}
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
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
  },
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
