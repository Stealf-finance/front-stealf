import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";
import * as bip39 from "bip39";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";

const SECURE_STORE_KEY = "stealf_private_key";
const MNEMONIC_STORE_KEY = "stealf_wallet_mnemonic";
const HARDENED_OFFSET = 0x80000000;

/**
 * SLIP-0010 ED25519 HD key derivation using @noble/hashes (React Native compatible).
 */
function derivePath(path: string, seed: Uint8Array): { key: Uint8Array } {
  // Master key from seed
  const I = hmac(sha512, "ed25519 seed", seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  // Derive each path segment
  const segments = path.split("/").slice(1); // remove "m"
  for (const segment of segments) {
    const isHardened = segment.endsWith("'");
    const index = parseInt(isHardened ? segment.slice(0, -1) : segment, 10);
    const hardenedIndex = isHardened ? index + HARDENED_OFFSET : index;

    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, hardenedIndex, false);

    const child = hmac(sha512, chainCode, data);
    key = child.slice(0, 32);
    chainCode = child.slice(32);
  }

  return { key };
}

interface SetupWalletResult {
  success: boolean;
  walletAddress?: string;
  mnemonic?: string;
  error?: string;
}

export function useSetupWallet() {
  const [loading, setLoading] = useState(false);

  /**
   * Create a new wallet with mnemonic and store the private key in SecureStore
   * Returns the mnemonic (seed phrase) for user backup
   */
  const handleCreateWallet = async (): Promise<SetupWalletResult> => {
    setLoading(true);
    try {
      const mnemonic = bip39.generateMnemonic(256);

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));

      if (!key || key.length !== 32) {
        throw new Error("Derivation failed: invalid derived key");
      }

      const keypair = Keypair.fromSeed(key);
      const privateKey = bs58.encode(keypair.secretKey);
      const walletAddress = keypair.publicKey.toBase58();

      await SecureStore.setItemAsync(MNEMONIC_STORE_KEY, mnemonic);

      return { success: true, walletAddress, mnemonic };
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
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));

      if (!key || key.length !== 32) {
        throw new Error("Derivation failed: invalid derived key");
      }

      const keypair = Keypair.fromSeed(key);
      const privateKey = bs58.encode(keypair.secretKey);
      const walletAddress = keypair.publicKey.toBase58();

      console.log('[ImportWallet] Storing private key for address:', walletAddress);
      console.log('[ImportWallet] Key length:', privateKey.length);
      await SecureStore.setItemAsync(SECURE_STORE_KEY, privateKey);
      // Also store mnemonic for redundancy
      await SecureStore.setItemAsync(MNEMONIC_STORE_KEY, mnemonic);

      // Verify both keys were stored correctly
      const readBackKey = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      const readBackMnemonic = await SecureStore.getItemAsync(MNEMONIC_STORE_KEY);
      console.log('[ImportWallet] Read-back private key:', readBackKey ? `OK (${readBackKey.length} chars)` : 'FAILED');
      console.log('[ImportWallet] Read-back mnemonic:', readBackMnemonic ? `OK (${readBackMnemonic.split(' ').length} words)` : 'FAILED');

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
