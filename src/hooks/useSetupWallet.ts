import { useState } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { Keypair } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";

import { STEALF_WALLET_CONFIG } from "../constants/turnkey";

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
        walletName: STEALF_WALLET_CONFIG.walletName,
        accounts: STEALF_WALLET_CONFIG.walletAccounts,
      });

      const wallets = await refreshWallets();
      const stealfWallet = wallets?.find((w: any) => w.walletName === STEALF_WALLET_CONFIG.walletName);
      const walletAddress = stealfWallet?.accounts?.[0]?.address;

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
        walletName: STEALF_WALLET_CONFIG.walletName,
        accounts: STEALF_WALLET_CONFIG.walletAccounts,
      });

      const wallets = await refreshWallets();
      const stealfWallet = wallets?.find((w: any) => w.walletName === STEALF_WALLET_CONFIG.walletName);
      const walletAddress = stealfWallet?.accounts?.[0]?.address;

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
   * Derive keypair from mnemonic and store private key in SecureStore (self-managed)
   */
  const handleImportWallet = async (mnemonic: string): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      const bip39 = require("bip39");
      const { derivePath } = require("ed25519-hd-key");
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const seedHex = Buffer.from(seed).toString("hex");
      const { key } = derivePath("m/44'/501'/0'/0'", seedHex);
      const keypair = Keypair.fromSeed(Uint8Array.from(key));
      const privateKey = bs58.encode(keypair.secretKey);
      const walletAddress = keypair.publicKey.toBase58();

      await SecureStore.setItemAsync(SECURE_STORE_KEY, privateKey);

      return { success: true, walletAddress };
    } catch (error: any) {
      console.error("Import wallet from mnemonic failed:", error);
      return { success: false, error: error?.message || "Failed to import wallet" };
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