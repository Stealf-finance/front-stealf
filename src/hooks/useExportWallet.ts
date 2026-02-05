import { useState } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import * as SecureStore from "expo-secure-store";

const STEALF_PRIVATE_KEY = "stealf_private_key";

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
   * Export a specific wallet account (returns private key)
   * @param accountAddress - The address of the account to export (cash_wallet or stealf_wallet)
   */
  const handleExportWalletAccount = async (accountAddress: string): Promise<ExportWalletResult> => {
    setLoading(true);
    try {
      const wallet = wallets?.[0];
      if (!wallet) {
        return {
          success: false,
          error: "No wallet found."
        };
      }

      const walletAccount = wallet.accounts?.find(
        account => account.address === accountAddress
      );

      if (!walletAccount) {
        return {
          success: false,
          error: `Account not found for address: ${accountAddress}`
        };
      }

      // Export the private key for this specific account
      const privateKey = await exportWalletAccount({
        address: walletAccount.address
      });

      if (!privateKey) {
        return {
          success: false,
          error: "Failed to retrieve private key."
        };
      }

      return {
        success: true,
        mnemonic: privateKey
      };
    } catch (error: any) {
      console.error("Export wallet account failed:", error);
      return {
        success: false,
        error: error?.message || "Failed to export wallet account"
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
      const privateKey = await SecureStore.getItemAsync(STEALF_PRIVATE_KEY);

      if (!privateKey) {
        return {
          success: false,
          error: "No cold wallet found in SecureStore."
        };
      }

      return {
        success: true,
        mnemonic: privateKey
      };
    } catch (error: any) {
      console.error("Export cold wallet failed:", error);
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
    exportWalletAccount: handleExportWalletAccount,
    exportColdWallet,
    loading
  };
}