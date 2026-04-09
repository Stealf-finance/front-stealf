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

const SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: false,
  sheetCornerRadius: 0,
  headerShown: false,
  contentStyle: { backgroundColor: '#000000' },
};

export default function AppLayout() {
  const { isAuthenticated, userData, loading } = useAuth();
  const { isLoadingBalance } = useWalletInfos(userData?.cash_wallet || '');
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoadingBalance) {
    return null;
  }

  return (
    <PagerProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" options={SHEET_OPTIONS} />
        <Stack.Screen name="send-private" options={SHEET_OPTIONS} />
        <Stack.Screen name="send-confirmation" options={SHEET_OPTIONS} />
        <Stack.Screen name="send-private-confirmation" options={SHEET_OPTIONS} />
        <Stack.Screen name="moove" options={SHEET_OPTIONS} />
        <Stack.Screen name="add-funds" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [1.0] }} />
        <Stack.Screen name="add-funds-privacy" options={SHEET_OPTIONS} />
        <Stack.Screen name="receive-select" options={{
          presentation: 'transparentModal' as const,
          animation: 'slide_from_bottom' as const,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} />
        <Stack.Screen name="receive-cash" options={{
          presentation: 'transparentModal' as const,
          animation: 'slide_from_bottom' as const,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} />
        <Stack.Screen name="receive-private" options={SHEET_OPTIONS} />
        <Stack.Screen name="shield" options={SHEET_OPTIONS} />
        <Stack.Screen name="unshield" options={SHEET_OPTIONS} />
        <Stack.Screen name="info" options={SHEET_OPTIONS} />
        <Stack.Screen name="transaction-history" options={SHEET_OPTIONS} />
        <Stack.Screen name="saving-dashboard" options={SHEET_OPTIONS} />
        <Stack.Screen name="deposit-withdraw" options={MODAL_OPTIONS} />
        <Stack.Screen name="transfer" options={SHEET_OPTIONS} />
        <Stack.Screen name="shielded-detail" options={{
          presentation: 'transparentModal' as const,
          animation: 'slide_from_bottom' as const,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} />
        <Stack.Screen name="wallet-detail" options={{
          presentation: 'transparentModal' as const,
          animation: 'slide_from_bottom' as const,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} />
      </Stack>
    </PagerProvider>
  );
}
