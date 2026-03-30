# Expo Router Migration — Stealf

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Stealf from custom AppNavigator (useReducer + RevolutPager + reanimated overlays) to Expo Router file-based routing, while preserving the custom horizontal swipe pager UX.

**Architecture:** The root `app/_layout.tsx` handles providers and auth gating via `<Redirect>`. A `(main)/(tabs)/_layout.tsx` renders the RevolutPager as a custom layout (bypasses `<Slot/>`). Overlay screens become Stack routes with `presentation: 'transparentModal'`. Auth screens live in an `(auth)` group with their own Stack.

**Tech Stack:** expo-router v4 (SDK 54), react-native-reanimated (swipePager preserved), react-native-screens (modal transitions), expo-linking (deep links)

---

## Task 1: Install and configure Expo Router

**Files:**
- Modify: `package.json` (main field)
- Modify: `app.config.js` (scheme + plugin)
- Modify: `tsconfig.json` (baseUrl)
- Create: `app/_layout.tsx` (minimal bootstrap)

- [ ] **Step 1: Install expo-router**

```bash
npx expo install expo-router
```

- [ ] **Step 2: Update package.json main field**

Change:
```json
"main": "index.ts"
```
To:
```json
"main": "expo-router/entry"
```

- [ ] **Step 3: Update app.config.js**

```js
import 'dotenv/config';

export default {
  expo: {
    name: "stealf",
    slug: "stealf",
    scheme: "stealf",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./src/assets/logo/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.stealf.app",
      associatedDomains: ["webcredentials:stealf.xyz"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.stealf.app",
      adaptiveIcon: {
        foregroundImage: "./src/assets/logo-transparent.png",
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: {
            scheme: "https",
            host: "localhost"
          }
        }
      ]
    },
    web: {
      favicon: "./src/assets/logo-transparent.png",
      bundler: "metro"
    },
    plugins: [
      "expo-secure-store",
      "expo-router"
    ],
    extra: {
      eas: {
        projectId: "9a158029-d062-48ff-b7b7-33854514570f"
      }
    },
  }
};
```

- [ ] **Step 4: Update tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": false,
    "skipLibCheck": true,
    "baseUrl": "."
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "src/types/**/*.d.ts"
  ],
  "exclude": [
    "modules/mopro-ffi"
  ]
}
```

- [ ] **Step 5: Create minimal app/_layout.tsx**

This is a temporary bootstrap — just wraps the existing App.tsx to verify Expo Router boots.

```tsx
// app/_layout.tsx
import '../polyfills';
import 'react-native-gesture-handler';

import React from 'react';
import App from '../App';

export default function RootLayout() {
  return <App />;
}
```

- [ ] **Step 6: Verify the app boots**

```bash
npx expo start --clear
```

Expected: App launches identically to before — all navigation still handled by AppNavigator.

- [ ] **Step 7: Commit**

```bash
git add app/_layout.tsx package.json app.config.js tsconfig.json
git commit -m "chore: install expo-router and configure entry point"
```

---

## Task 2: Create PagerContext for swipe state sharing

**Files:**
- Create: `src/navigation/PagerContext.tsx`

- [ ] **Step 1: Create PagerContext**

```tsx
// src/navigation/PagerContext.tsx
import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import type { RevolutPagerRef } from './swipePager';
import type { PageType } from './types';

interface PagerContextValue {
  currentPage: PageType;
  navigateToPage: (page: PageType) => void;
  pagerRef: React.RefObject<RevolutPagerRef | null>;
  onIndexChange: (index: number) => void;
}

const PagerContext = createContext<PagerContextValue | null>(null);

const PAGE_ORDER: PageType[] = ['home', 'privacy', 'profile'];

export function PagerProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const pagerRef = useRef<RevolutPagerRef | null>(null);

  const navigateToPage = useCallback((page: PageType) => {
    const index = PAGE_ORDER.indexOf(page);
    if (index >= 0) {
      setCurrentPage(page);
      pagerRef.current?.scrollToIndex(index);
    }
  }, []);

  const onIndexChange = useCallback((index: number) => {
    setCurrentPage(PAGE_ORDER[index]);
  }, []);

  return (
    <PagerContext.Provider value={{ currentPage, navigateToPage, pagerRef, onIndexChange }}>
      {children}
    </PagerContext.Provider>
  );
}

export function usePager() {
  const ctx = useContext(PagerContext);
  if (!ctx) throw new Error('usePager must be used inside PagerProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/navigation/PagerContext.tsx
git commit -m "feat: add PagerContext for swipe state sharing"
```

---

## Task 3: Create SplashContext for cross-route splash control

**Files:**
- Create: `src/contexts/SplashContext.tsx`

- [ ] **Step 1: Create SplashContext**

```tsx
// src/contexts/SplashContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SplashContextValue {
  splashVisible: boolean;
  splashFading: boolean;
  showSplash: () => void;
  startFade: () => void;
  hideSplash: () => void;
}

const SplashContext = createContext<SplashContextValue | null>(null);

export function SplashProvider({ children }: { children: ReactNode }) {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const showSplash = useCallback(() => {
    setSplashVisible(true);
    setSplashFading(false);
  }, []);

  const startFade = useCallback(() => {
    setSplashFading(true);
  }, []);

  const hideSplash = useCallback(() => {
    setSplashVisible(false);
    setSplashFading(false);
  }, []);

  return (
    <SplashContext.Provider value={{ splashVisible, splashFading, showSplash, startFade, hideSplash }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const ctx = useContext(SplashContext);
  if (!ctx) throw new Error('useSplash must be used inside SplashProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/SplashContext.tsx
git commit -m "feat: add SplashContext for cross-route splash control"
```

---

## Task 4: Root layout with providers, splash, and auth redirect

**Files:**
- Rewrite: `app/_layout.tsx`

- [ ] **Step 1: Rewrite app/_layout.tsx**

```tsx
// app/_layout.tsx
import '../polyfills';
import 'react-native-gesture-handler';

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { TURNKEY_CONFIG, TURNKEY_CALLBACKS } from '../src/constants/turnkey';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { SplashProvider, useSplash } from '../src/contexts/SplashContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { WelcomeLoader } from '../src/components/WelcomeLoader';
import { useWalletInfos } from '../src/hooks/wallet/useWalletInfos';
import { validateEnv } from '../src/utils/validateEnv';
import Logo from '../src/assets/logo/logo.svg';

SplashScreen.preventAutoHideAsync();

onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(state.isConnected ?? true))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootNavigator() {
  const { isAuthenticated, userData, loading } = useAuth();
  const { splashVisible, splashFading, startFade, hideSplash } = useSplash();
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');

  // Authenticated -> fade splash once data loaded
  useEffect(() => {
    if (isAuthenticated && splashVisible && !splashFading && !isLoadingBalance) {
      const timer = setTimeout(() => startFade(), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoadingBalance, splashVisible, splashFading, startFade]);

  // Not authenticated + not loading -> hide splash
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const timer = setTimeout(() => hideSplash(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, hideSplash]);

  // Auth redirect
  if (!isAuthenticated && !loading && !splashVisible) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>

      {splashVisible && (
        <View style={styles.splashOverlay}>
          <WelcomeLoader
            logo={<Logo width={80} height={80} />}
            startOpaque
            fadeOutTrigger={splashFading}
            onFadeOutEnd={hideSplash}
          />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Sansation-Regular': require('../src/assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../src/assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../src/assets/font/Sansation/Sansation-Light.ttf'),
    'Sansation-Italic': require('../src/assets/font/Sansation/Sansation-Italic.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        validateEnv();
        await Asset.loadAsync([
          require('../src/assets/fond.png'),
          require('../src/assets/logo-transparent.png'),
        ]);
      } catch (e) {
        if (__DEV__) console.error('Erreur initialisation:', e);
      } finally {
        setAppReady(true);
      }
    }
    if (fontsLoaded || fontError) prepare();
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
              <AuthProvider>
                <SplashProvider>
                  <RootNavigator />
                </SplashProvider>
              </AuthProvider>
            </TurnkeyProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
```

- [ ] **Step 2: Verify app boots with root layout**

```bash
npx expo start --clear
```

Expected: App boots, splash shows, then either redirects to auth (404 page expected — auth routes not created yet) or shows main content if already authenticated.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx src/contexts/SplashContext.tsx
git commit -m "feat: root layout with providers, splash, and auth redirect"
```

---

## Task 5: Auth group routes

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-in.tsx`
- Create: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create auth layout**

```tsx
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
```

- [ ] **Step 2: Create sign-in route**

```tsx
// app/(auth)/sign-in.tsx
import { useRouter } from 'expo-router';
import SignInScreen from '../../src/app/(auth)/SignInScreen';
import { useSplash } from '../../src/contexts/SplashContext';

export default function SignInRoute() {
  const router = useRouter();
  const { showSplash } = useSplash();

  return (
    <SignInScreen
      onSwitchToSignUp={() => router.replace('/(auth)/sign-up')}
      onAuthStart={showSplash}
    />
  );
}
```

- [ ] **Step 3: Create sign-up route**

```tsx
// app/(auth)/sign-up.tsx
import { useRouter } from 'expo-router';
import SignUpScreen from '../../src/app/(auth)/SignUpScreen';
import { useSplash } from '../../src/contexts/SplashContext';

export default function SignUpRoute() {
  const router = useRouter();
  const { showSplash } = useSplash();

  return (
    <SignUpScreen
      onSwitchToSignIn={() => router.replace('/(auth)/sign-in')}
      onAuthStart={showSplash}
    />
  );
}
```

- [ ] **Step 4: Verify auth flow**

```bash
npx expo start --clear
```

Expected: Sign in / sign up screens render. Switching between them works. Passkey auth triggers splash, then redirects to (main) — which will 404 for now.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/
git commit -m "feat: auth group routes (sign-in, sign-up)"
```

---

## Task 6: Main layout with tabs and overlay modal definitions

**Files:**
- Create: `app/(main)/_layout.tsx`
- Create: `app/(main)/(tabs)/_layout.tsx`
- Create: `app/(main)/(tabs)/index.tsx`
- Create: `app/(main)/(tabs)/privacy.tsx`
- Create: `app/(main)/(tabs)/profile.tsx`

- [ ] **Step 1: Create main layout with overlay Stack screens**

```tsx
// app/(main)/_layout.tsx
import { Stack } from 'expo-router';
import { PagerProvider } from '../../src/navigation/PagerContext';

const MODAL_OPTIONS = {
  presentation: 'transparentModal' as const,
  animation: 'slide_from_bottom' as const,
  headerShown: false,
  contentStyle: { backgroundColor: '#000000' },
};

export default function MainLayout() {
  return (
    <PagerProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" options={MODAL_OPTIONS} />
        <Stack.Screen name="send-private" options={MODAL_OPTIONS} />
        <Stack.Screen name="moove" options={MODAL_OPTIONS} />
        <Stack.Screen name="add-funds" options={MODAL_OPTIONS} />
        <Stack.Screen name="add-funds-privacy" options={MODAL_OPTIONS} />
        <Stack.Screen name="deposit-private-cash" options={MODAL_OPTIONS} />
        <Stack.Screen name="info" options={MODAL_OPTIONS} />
        <Stack.Screen name="transaction-history" options={MODAL_OPTIONS} />
        <Stack.Screen name="savings" options={MODAL_OPTIONS} />
      </Stack>
    </PagerProvider>
  );
}
```

- [ ] **Step 2: Create tabs layout with RevolutPager**

```tsx
// app/(main)/(tabs)/_layout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MinimalNavBar from '../../../src/components/MinimalNavBar';
import HomeScreen from '../../../src/app/(tabs)/HomeScreen';
import PrivacyScreen from '../../../src/app/(tabs)/PrivacyScreen';
import ProfileScreen from '../../../src/app/(tabs)/Profile';
import { RevolutPager } from '../../../src/navigation/swipePager';
import { usePager } from '../../../src/navigation/PagerContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useSplash } from '../../../src/contexts/SplashContext';
import type { PageType } from '../../../src/navigation/types';

export default function TabsLayout() {
  const router = useRouter();
  const { currentPage, navigateToPage, pagerRef, onIndexChange } = usePager();
  const { userData, logout } = useAuth();
  const { showSplash } = useSplash();

  const handleNavigateToPage = (page: PageType) => {
    if (page === 'transactionHistory') {
      const walletType = currentPage === 'privacy' ? 'privacy' : 'cash';
      router.push(`/(main)/transaction-history?walletType=${walletType}`);
      return;
    }
    navigateToPage(page);
  };

  const handleLogout = async () => {
    await logout();
    navigateToPage('home');
  };

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
            {
              key: 'home',
              render: () => (
                <HomeScreen
                  onNavigateToPage={handleNavigateToPage}
                  onOpenAddFunds={() => router.push('/(main)/add-funds')}
                  onOpenSend={() => router.push('/(main)/send?walletType=cash')}
                  onOpenMoove={() => router.push('/(main)/moove?direction=toPrivacy')}
                  onOpenDepositPrivateCash={() => router.push('/(main)/deposit-private-cash')}
                  onOpenProfile={() => navigateToPage('profile')}
                  onOpenInfo={() => router.push('/(main)/info?source=home')}
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
                  onOpenMoove={() => router.push('/(main)/moove?direction=toCash')}
                  onOpenSend={() => router.push('/(main)/send?walletType=stealf')}
                  onOpenAddFundsPrivacy={() => router.push('/(main)/add-funds-privacy')}
                  onOpenDepositPrivateCash={() => router.push('/(main)/deposit-private-cash')}
                  onOpenProfile={() => navigateToPage('profile')}
                  onOpenInfo={() => router.push('/(main)/info?source=privacy')}
                  onOpenSavings={() => router.push('/(main)/savings')}
                  onShowLoader={showSplash}
                  userEmail={userData?.email}
                  currentPage={currentPage}
                />
              ),
            },
            {
              key: 'profile',
              render: () => (
                <ProfileScreen
                  onBack={() => navigateToPage('home')}
                  onNavigateToPage={handleNavigateToPage}
                  onLogout={handleLogout}
                  currentPage={currentPage}
                  userEmail={userData?.email}
                  username={userData?.username}
                />
              ),
            },
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
```

- [ ] **Step 3: Create placeholder tab route files**

These are required for Expo Router to register the route segments, even though the custom layout doesn't render `<Slot/>`.

```tsx
// app/(main)/(tabs)/index.tsx
import { View } from 'react-native';
export default function HomeRoute() {
  return <View />;
}
```

```tsx
// app/(main)/(tabs)/privacy.tsx
import { View } from 'react-native';
export default function PrivacyRoute() {
  return <View />;
}
```

```tsx
// app/(main)/(tabs)/profile.tsx
import { View } from 'react-native';
export default function ProfileRoute() {
  return <View />;
}
```

- [ ] **Step 4: Verify tabs render with swipe pager**

```bash
npx expo start --clear
```

Expected: After auth, the 3 tabs render with horizontal swipe. MinimalNavBar works. No overlays yet.

- [ ] **Step 5: Commit**

```bash
git add app/(main)/
git commit -m "feat: main layout with RevolutPager tabs and modal definitions"
```

---

## Task 7: Overlay modal routes

**Files:**
- Create: `app/(main)/send.tsx`
- Create: `app/(main)/send-private.tsx`
- Create: `app/(main)/moove.tsx`
- Create: `app/(main)/add-funds.tsx`
- Create: `app/(main)/add-funds-privacy.tsx`
- Create: `app/(main)/deposit-private-cash.tsx`
- Create: `app/(main)/info.tsx`
- Create: `app/(main)/transaction-history.tsx`
- Create: `app/(main)/savings.tsx`

- [ ] **Step 1: Create all overlay route files**

```tsx
// app/(main)/send.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import SendScreen from '../../src/app/(send)/Send';

export default function SendRoute() {
  const { walletType } = useLocalSearchParams<{ walletType: 'cash' | 'stealf' }>();
  const router = useRouter();
  return <SendScreen onBack={() => router.back()} walletType={walletType || 'cash'} />;
}
```

```tsx
// app/(main)/send-private.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import SendPrivateScreen from '../../src/app/(send)/SendPrivate';

export default function SendPrivateRoute() {
  const { transferType } = useLocalSearchParams<{ transferType: 'basic' | 'private' }>();
  const router = useRouter();
  return <SendPrivateScreen onBack={() => router.back()} transferType={transferType || 'private'} />;
}
```

```tsx
// app/(main)/moove.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import MooveScreen from '../../src/app/(send)/moove';

export default function MooveRoute() {
  const { direction } = useLocalSearchParams<{ direction: 'toPrivacy' | 'toCash' }>();
  const router = useRouter();
  return <MooveScreen onBack={() => router.back()} direction={direction || 'toCash'} />;
}
```

```tsx
// app/(main)/add-funds.tsx
import { useRouter } from 'expo-router';
import AddFundsScreen from '../../src/app/(add)/AddFunds';

export default function AddFundsRoute() {
  const router = useRouter();
  return <AddFundsScreen onBack={() => router.back()} />;
}
```

```tsx
// app/(main)/add-funds-privacy.tsx
import { useRouter } from 'expo-router';
import AddFundsPrivacyScreen from '../../src/app/(add)/AddFundsPrivacy';

export default function AddFundsPrivacyRoute() {
  const router = useRouter();
  return <AddFundsPrivacyScreen onBack={() => router.back()} />;
}
```

```tsx
// app/(main)/deposit-private-cash.tsx
import { useRouter } from 'expo-router';
import DepositPrivateCashScreen from '../../src/app/(deposit)/DepositPrivateCash';

export default function DepositPrivateCashRoute() {
  const router = useRouter();
  return <DepositPrivateCashScreen onBack={() => router.back()} />;
}
```

```tsx
// app/(main)/info.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import InfoScreen from '../../src/app/(infos)/InfoScreen';

export default function InfoRoute() {
  const { source } = useLocalSearchParams<{ source: 'home' | 'privacy' }>();
  const router = useRouter();
  return <InfoScreen onBack={() => router.back()} source={source || 'home'} />;
}
```

```tsx
// app/(main)/transaction-history.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import TransactionHistoryScreen from '../../src/app/(infos)/TransactionHistoryScreen';

export default function TransactionHistoryRoute() {
  const { walletType } = useLocalSearchParams<{ walletType: 'cash' | 'privacy' }>();
  const router = useRouter();
  return <TransactionHistoryScreen onClose={() => router.back()} walletType={walletType || 'cash'} />;
}
```

```tsx
// app/(main)/savings.tsx
import { useRouter } from 'expo-router';
import SavingsScreen from '../../src/app/(savings)/SavingsScreen';

export default function SavingsRoute() {
  const router = useRouter();
  return <SavingsScreen onBack={() => router.back()} />;
}
```

- [ ] **Step 2: Verify all overlays open and dismiss**

```bash
npx expo start --clear
```

Expected: Every overlay opens from tabs with slide-from-bottom animation and `router.back()` dismisses correctly.

- [ ] **Step 3: Commit**

```bash
git add app/(main)/send.tsx app/(main)/send-private.tsx app/(main)/moove.tsx app/(main)/add-funds.tsx app/(main)/add-funds-privacy.tsx app/(main)/deposit-private-cash.tsx app/(main)/info.tsx app/(main)/transaction-history.tsx app/(main)/savings.tsx
git commit -m "feat: all overlay screens as modal routes"
```

---

## Task 8: Cleanup — remove old navigation code

**Files:**
- Delete: `src/navigation/AppNavigator.tsx`
- Delete: `src/utils/animations.ts` (dead code since batch 3)
- Modify: `App.tsx` (strip down or delete — root layout replaces it)
- Keep: `index.ts` (can be deleted but harmless)

- [ ] **Step 1: Delete AppNavigator.tsx**

```bash
rm src/navigation/AppNavigator.tsx
```

- [ ] **Step 2: Delete animations.ts**

```bash
rm src/utils/animations.ts
```

- [ ] **Step 3: Simplify App.tsx**

Replace App.tsx with a minimal fallback (Expo Router doesn't use it, but keep it in case of direct imports):

```tsx
// App.tsx
export { default } from './app/_layout';
```

- [ ] **Step 4: Verify everything still works**

```bash
npx expo start --clear
```

Expected: Full app works — auth, tabs with swipe, all overlays, splash.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old AppNavigator and animations (replaced by Expo Router)"
```

---

## Task 9: Verify end-to-end

- [ ] **Step 1: Test complete auth flow**
  - Cold start -> splash -> sign-in screen
  - Switch to sign-up -> fill form -> email verification
  - Passkey creation -> wallet setup -> splash -> main tabs

- [ ] **Step 2: Test tab navigation**
  - Swipe left/right between Home, Privacy, Profile
  - MinimalNavBar tab switching
  - Tab state preserved after overlay dismiss

- [ ] **Step 3: Test all overlay modals**
  - Home: Add Funds, Send (cash), Moove (toPrivacy), Info, Transaction History
  - Privacy: Add Funds Privacy, Send (stealf), Moove (toCash), Info, Savings, Deposit Private Cash
  - Profile: Logout
  - All overlays: back/dismiss returns to correct tab

- [ ] **Step 4: Test edge cases**
  - Double-tap overlay button (should not open twice)
  - Back gesture on iOS (swipe right should dismiss modal)
  - App backgrounding and foregrounding during auth
  - Splash loader on re-auth

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| RevolutPager gesture conflicts with Stack modal gestures | `transparentModal` disables horizontal Stack gestures. Pager's `activeOffsetX` avoids conflict. |
| Polyfill load order with expo-router/entry | `import '../polyfills'` is first line of `app/_layout.tsx`. Test crypto operations early. |
| Custom tabs layout not rendering `<Slot/>` | Intentional — pager is source of truth. Placeholder route files satisfy file-system routing. |
| `transparentModal` animation differs from current reanimated spring | The spring config (damping:22, stiffness:200) was cosmetic. `slide_from_bottom` is close enough. Can be customized via `react-native-screens` if needed. |
| expo-router v4 compatibility with SDK 54 | Verified: SDK 54 ships expo-router v4. All APIs used (`useLocalSearchParams`, `transparentModal`, `Redirect`) are stable. |
