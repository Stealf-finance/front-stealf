import { useState } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { Keypair } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";

const SECURE_STORE_KEY = "stealf_private_key";

interface SetupWalletResult {
  success: boolean;
  walletAddress?: string;
  privateKey?: string;
  error?: string;
}

export function useSetupWallet() {
  const { importWallet, refreshWallets, createWallet } = useTurnkey();
  const [loading, setLoading] = useState(false);

  const handleImportAndStoreWallet = async (mnemonic: string): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      await importWallet({
        mnemonic,
        walletName: "StealfWallet",
        accounts: [
          {
            curve: "CURVE_ED25519",
            pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/501'/0'/0'",
            addressFormat: "ADDRESS_FORMAT_SOLANA",
          },
        ],
      });

      const wallets = await refreshWallets();
      const walletAddress = wallets?.[0]?.accounts?.[0]?.address;

      return { success: true, walletAddress };
    } catch (error: any) {
      console.error("Import wallet failed:", error);
      return { success: false, error: error?.message || "Failed to import wallet" };
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndStoreWallet = async (): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      await createWallet({
        walletName: "StealfWallet",
        accounts: [
          {
            curve: "CURVE_ED25519",
            pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/501'/0'/0'",
            addressFormat: "ADDRESS_FORMAT_SOLANA",
          },
        ],
      });

      const wallets = await refreshWallets();
      const walletAddress = wallets?.[0]?.accounts?.[0]?.address;

      return { success: true, walletAddress };
    } catch (error: any) {
      console.error("Create wallet failed:", error);
      return { success: false, error: error?.message || "Failed to create wallet" };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new wallet locally and store the private key in SecureStore
   */
  const handleCreateWallet = async (): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      const keypair = Keypair.generate();
      const privateKey = bs58.encode(keypair.secretKey);
      const walletAddress = keypair.publicKey.toBase58();

      await SecureStore.setItemAsync(SECURE_STORE_KEY, privateKey);

      return { success: true, walletAddress, privateKey };
    } catch (error: any) {
      console.error("Create local wallet failed:", error);
      return { success: false, error: error?.message || "Failed to create wallet" };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Import an existing wallet from a private key and store it in SecureStore
   */
  const handleImportWallet = async (privateKey: string): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      const secretKey = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      const walletAddress = keypair.publicKey.toBase58();

      await SecureStore.setItemAsync(SECURE_STORE_KEY, privateKey);

      return { success: true, walletAddress };
    } catch (error: any) {
      console.error("Import local wallet failed:", error);
      return { success: false, error: error?.message || "Invalid private key" };
    } finally {
      setLoading(false);
    }
  };

  return {
    handleImportAndStoreWallet,
    handleCreateAndStoreWallet,
    handleCreateWallet,
    handleImportWallet,
    loading,
  };
}