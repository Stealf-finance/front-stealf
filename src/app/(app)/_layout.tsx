import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
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
  sheetCornerRadius: 16,
  sheetAllowedDetents: [1.0],
  headerShown: false,
  contentStyle: { backgroundColor: '#000' },
};

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <PagerProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="send-private" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="send-confirmation" options={SHEET_OPTIONS} />
        <Stack.Screen name="send-private-confirmation" options={SHEET_OPTIONS} />
        <Stack.Screen name="moove" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="add-funds" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="add-funds-privacy" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="receive-select" options={{
          ...SHEET_OPTIONS,
          sheetGrabberVisible: false,
          sheetCornerRadius: 16,
          sheetAllowedDetents: [0.5],
        }} />
        <Stack.Screen name="receive-cash" options={{
          ...SHEET_OPTIONS,
          sheetGrabberVisible: false,
          sheetCornerRadius: 16,
          sheetAllowedDetents: [0.9],
        }} />
        <Stack.Screen name="receive-private" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="shield" options={SHEET_OPTIONS} />
        <Stack.Screen name="unshield" options={SHEET_OPTIONS} />
        <Stack.Screen name="info" options={{
          ...SHEET_OPTIONS,
          sheetAllowedDetents: [0.55],
        }} />
        <Stack.Screen name="transaction-history" options={SHEET_OPTIONS} />
        <Stack.Screen name="saving-dashboard" options={SHEET_OPTIONS} />
        <Stack.Screen name="deposit-withdraw" options={MODAL_OPTIONS} />
        <Stack.Screen name="transfer" options={{
          ...SHEET_OPTIONS,
          sheetAllowedDetents: [0.9],
        }} />
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
