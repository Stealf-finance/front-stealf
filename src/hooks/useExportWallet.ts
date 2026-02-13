import { useState } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { walletKeyCache } from "../services/walletKeyCache";

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
      if (__DEV__) console.error("Export wallet failed:", error);
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
      if (__DEV__) console.error("Export wallet by address failed:", error);
      return {
        success: false,
        error: error?.message || "Failed to export wallet"
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export cold wallet private key — uses in-memory cache with SecureStore fallback
   */
  const exportColdWallet = async (): Promise<ExportWalletResult> => {
    setLoading(true);
    try {
      const mnemonic = walletKeyCache.getMnemonic();
      if (mnemonic) {
        return { success: true, mnemonic };
      }

      const privateKey = await walletKeyCache.getPrivateKey();
      if (privateKey) {
        return { success: true, mnemonic: privateKey };
      }
      return {
        success: false,
        error: "No cold wallet found."
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to export cold wallet"
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
