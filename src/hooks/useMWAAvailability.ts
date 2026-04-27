import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface MWAAvailabilityState {
  isMWAAvailable: boolean;
  isChecking: boolean;
}

let cachedResult: boolean | null = null;

/**
 * Detects whether the Mobile Wallet Adapter protocol is available on the device.
 * On Seeker (Android), the native MWA module resolves and the Seed Vault Wallet
 * answers the intent. On iOS or non-MWA Android, returns false.
 */
export function useMWAAvailability(): MWAAvailabilityState {
  const [isMWAAvailable, setIsMWAAvailable] = useState(cachedResult ?? false);
  const [isChecking, setIsChecking] = useState(cachedResult === null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || cachedResult !== null) {
      if (cachedResult !== null) {
        setIsMWAAvailable(cachedResult);
        setIsChecking(false);
      }
      return;
    }

    checkedRef.current = true;

    if (Platform.OS !== 'android') {
      cachedResult = false;
      setIsMWAAvailable(false);
      setIsChecking(false);
      return;
    }

    try {
      const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
      const available = typeof mwa.transact === 'function';
      cachedResult = available;
      setIsMWAAvailable(available);
    } catch {
      cachedResult = false;
      setIsMWAAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isMWAAvailable, isChecking };
}
