/**
 * MWA (Mobile Wallet Adapter / Seed Vault) is not used for the seeker wallet.
 * The seeker wallet signs locally via the cold wallet stored in SecureStore.
 * This hook always returns false so MWA-gated UI is hidden on all platforms.
 */
export function useMWAAvailability() {
  return { isMWAAvailable: false, isChecking: false };
}
