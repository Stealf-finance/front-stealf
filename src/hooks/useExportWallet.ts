import { useState } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import * as SecureStore from "expo-secure-store";

const SECURE_STORE_KEY = "stealf_private_key";
const MNEMONIC_STORE_KEY = "stealf_wallet_mnemonic";

/**
 * Read a SecureStore key with retry.
 * iOS Keychain can briefly return null during inactive→active transitions.
 */
async function secureGet(key: string, retries = 3, delayMs = 300): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    const val = await SecureStore.getItemAsync(key);
    if (val) return val;
    if (i < retries - 1) {
      console.log(`[SecureGet] ${key} returned null, retry ${i + 1}/${retries - 1} in ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return null;
}

interface ExportWalletResult {
  success: boolean;
  mnemonic?: string;
  error?: string;
}

export function useExportWallet() {
  const { exportWallet, exportWalletAccount, wallets } = useTurnkey();
  const [loading, setLoading] = useState(false);

  /**
   * Export entire wallet (returns mnemonic/seed phrase)
   * This allows recovery of ALL wallet accounts
   */
  const handleExportWallet = async (): Promise<ExportWalletResult> => {
    setLoading(true);
    try {
      const walletId = wallets?.[0]?.walletId;
      if (!walletId) {
        return {
          success: false,
          error: "No wallet found. Please create a wallet first."
        };
      }

      const mnemonic = await exportWallet({ walletId });

      if (!mnemonic) {
        return {
          success: false,
          error: "Failed to retrieve wallet mnemonic."
        };
      }

      return {
        success: true,
        mnemonic
      };
    } catch (error: any) {
      console.error("Export wallet failed:", error);
      return {
        success: false,
        error: error?.message || "Failed to export wallet"
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export wallet mnemonic by finding the wallet that contains the given address
   * @param accountAddress - The address to search for (cash_wallet or stealf_wallet)
   */
  const exportWalletByAddress = async (accountAddress: string): Promise<ExportWalletResult> => {
    setLoading(true);
    try {
      if (!wallets || wallets.length === 0) {
        return {
          success: false,
          error: "No wallet found."
        };
      }

      let foundWallet = null;
      for (const wallet of wallets) {
        const account = wallet.accounts?.find(
          (acc: any) => acc.address === accountAddress
        );
        if (account) {
          foundWallet = wallet;
          break;
        }
      }

      if (!foundWallet) {
        return {
          success: false,
          error: `Wallet not found for address: ${accountAddress}`
        };
      }

      const mnemonic = await exportWallet({ walletId: foundWallet.walletId });

      if (!mnemonic) {
        return {
          success: false,
          error: "Failed to retrieve wallet mnemonic."
        };
      }

      return {
        success: true,
        mnemonic
      };
    } catch (error: any) {
      console.error("Export wallet by address failed:", error);
      return {
        success: false,
        error: error?.message || "Failed to export wallet"
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export cold wallet private key from SecureStore
   * Used when the stealf_wallet is stored locally (not in Turnkey)
   */
  const exportColdWallet = async (): Promise<ExportWalletResult> => {
    setLoading(true);
    try {
      console.log('[ExportWallet] Reading SecureStore keys...');

      let mnemonic: string | null = null;
      try {
        mnemonic = await secureGet(MNEMONIC_STORE_KEY);
        console.log('[ExportWallet] stealf_wallet_mnemonic:', mnemonic ? `found (${mnemonic.length} chars)` : 'null');
      } catch (e: any) {
        console.error('[ExportWallet] ERROR reading mnemonic:', e?.message);
      }
      if (mnemonic) {
        return { success: true, mnemonic };
      }

      let privateKey: string | null = null;
      try {
        privateKey = await secureGet(SECURE_STORE_KEY);
        console.log('[ExportWallet] stealf_private_key:', privateKey ? `found (${privateKey.length} chars)` : 'null');
      } catch (e: any) {
        console.error('[ExportWallet] ERROR reading private key:', e?.message);
      }
      if (privateKey) {
        return { success: true, mnemonic: privateKey };
      }

      console.log('[ExportWallet] Neither key found in SecureStore');
      return {
        success: false,
        error: "No cold wallet found in SecureStore."
      };
    } catch (error: any) {
      console.error("[ExportWallet] Unexpected error:", error);
      return {
        success: false,
        error: error?.message || "Failed to export cold wallet from SecureStore"
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    exportWallet: handleExportWallet,
    exportWalletByAddress,
    exportColdWallet,
    loading
  };
}