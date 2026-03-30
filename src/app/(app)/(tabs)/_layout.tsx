import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MinimalNavBar from '../../../components/MinimalNavBar';
import HomeScreen from './index';
import PrivacyScreen from './privacy';
import ProfileScreen from './profile';
import { RevolutPager } from '../../../navigation/swipePager';
import { usePager } from '../../../navigation/PagerContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { PageType } from '../../../navigation/types';

export default function TabsLayout() {
  const router = useRouter();
  const { currentPage, navigateToPage, pagerRef, onIndexChange } = usePager();
  const { userData } = useAuth();

  const handleNavigateToPage = useCallback((page: PageType) => {
    if (page === 'transactionHistory') {
      const walletType = currentPage === 'privacy' ? 'privacy' : 'cash';
      router.push(`/(app)/transaction-history?walletType=${walletType}`);
      return;
    }
    navigateToPage(page);
  }, [currentPage, router, navigateToPage]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.fixedNavBar}>
        <MinimalNavBar
          onOpenProfile={() => navigateToPage('profile')}
          onNavigateToPage={handleNavigateToPage}
          currentPage={currentPage}
          username={userData?.username}
        />
      </View>

      <View style={styles.mainContainer}>
        <RevolutPager
          ref={pagerRef}
          initialIndex={0}
          pages={[
            { key: 'home', render: () => <HomeScreen /> },
            { key: 'privacy', render: () => <PrivacyScreen /> },
            { key: 'profile', render: () => <ProfileScreen /> },
          ]}
          onIndexChange={onIndexChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
});
