import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

interface MWAAvailabilityState {
  isMWAAvailable: boolean;
  isChecking: boolean;
}

// Module-level cache to avoid re-checking on every mount
let cachedResult: boolean | null = null;

/**
 * Hook to detect if Mobile Wallet Adapter is available on the device.
 * Only available on Android devices with a compatible wallet (Seed Vault).
 * Result is cached for the session duration.
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

    const checkAvailability = async () => {
      try {
        await transact(async (wallet) => {
          // Just authorize to check if a wallet is available
          // This will throw if no wallet app is installed
          await wallet.authorize({
            chain: "solana:mainnet",
            identity: {
              name: "Stealf",
              uri: "https://stealf.xyz" as `${string}://${string}`,
              icon: "favicon.ico",
            },
          });
          // Immediately deauthorize - we just wanted to check availability
          await wallet.deauthorize({
            auth_token: "",
          });
        });
        cachedResult = true;
        setIsMWAAvailable(true);
      } catch {
        // Any error means MWA is not available - fail silently
        cachedResult = false;
        setIsMWAAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, []);

  return { isMWAAvailable, isChecking };
}
