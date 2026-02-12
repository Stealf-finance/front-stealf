import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";

interface MWAAvailabilityState {
  isMWAAvailable: boolean;
  isChecking: boolean;
}

// Module-level cache to avoid re-checking on every mount
let cachedResult: boolean | null = null;

/**
 * Hook to detect if Mobile Wallet Adapter is available on the device.
 * On Android, checks if the MWA protocol module can be loaded.
 * Does NOT open the Seed Vault — just checks module availability.
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

    // MWA is Android-only
    if (Platform.OS !== "android") {
      cachedResult = false;
      setIsMWAAvailable(false);
      setIsChecking(false);
      return;
    }

    // On Android, check if the MWA module is importable
    // The transact function existing means the native module is linked
    try {
      const mwa = require("@solana-mobile/mobile-wallet-adapter-protocol-web3js");
      const available = typeof mwa.transact === "function";
      console.log("[useMWAAvailability] MWA module available:", available);
      cachedResult = available;
      setIsMWAAvailable(available);
    } catch {
      console.log("[useMWAAvailability] MWA module not available");
      cachedResult = false;
      setIsMWAAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isMWAAvailable, isChecking };
}
