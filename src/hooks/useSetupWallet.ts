import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

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
    handleCreateWallet,
    handleImportWallet,
    loading,
  };
}