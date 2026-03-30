import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/wallet/useWalletInfos';
import { PagerProvider } from '../../navigation/PagerContext';

const MODAL_OPTIONS = {
  presentation: 'transparentModal' as const,
  animation: 'slide_from_bottom' as const,
  headerShown: false,
  contentStyle: { backgroundColor: '#000000' },
};

export default function AppLayout() {
  const { isAuthenticated, userData, loading } = useAuth();
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');

  // Auth still loading → keep splash, render nothing
  if (loading) {
    return null;
  }

  // Not authenticated → redirect to sign-in
  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  // Authenticated but balance still loading → render nothing (splash covers)
  if (isLoadingBalance) {
    return null;
  }

  return (
    <PagerProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" options={MODAL_OPTIONS} />
        <Stack.Screen name="send-private" options={MODAL_OPTIONS} />
        <Stack.Screen name="send-confirmation" options={MODAL_OPTIONS} />
        <Stack.Screen name="send-private-confirmation" options={MODAL_OPTIONS} />
        <Stack.Screen name="moove" options={MODAL_OPTIONS} />
        <Stack.Screen name="add-funds" options={MODAL_OPTIONS} />
        <Stack.Screen name="add-funds-privacy" options={MODAL_OPTIONS} />
        <Stack.Screen name="deposit-private" options={MODAL_OPTIONS} />
        <Stack.Screen name="info" options={MODAL_OPTIONS} />
        <Stack.Screen name="transaction-history" options={MODAL_OPTIONS} />
        <Stack.Screen name="saving-dashboard" options={MODAL_OPTIONS} />
        <Stack.Screen name="deposit-withdraw" options={MODAL_OPTIONS} />
      </Stack>
    </PagerProvider>
  );
}
