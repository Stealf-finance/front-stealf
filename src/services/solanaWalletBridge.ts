import { WalletType, SolanaWalletInterface } from "@turnkey/wallet-stamper";
import bs58 from "bs58";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import { ed25519 } from "@noble/curves/ed25519";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import * as bip39 from "bip39";

/** SecureStore keys for the seeker wallet */
const COLD_WALLET_STORE_KEY = "stealf_private_key";
const MNEMONIC_STORE_KEY = "stealf_wallet_mnemonic";
const HARDENED_OFFSET = 0x80000000;

/** SLIP-0010 ED25519 HD derivation (same algorithm as useInitPrivateWallet and Moove.tsx) */
function deriveKeyFromSeed(seed: Uint8Array): Uint8Array {
  const I = hmac(sha512, "ed25519 seed", seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);
  // m/44'/501'/0'/0'
  const segments = [44, 501, 0, 0];
  for (const index of segments) {
    const hardenedIndex = index + HARDENED_OFFSET;
    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, hardenedIndex, false);
    const child = hmac(sha512, chainCode, data);
    key = child.slice(0, 32);
    chainCode = child.slice(32);
  }
  return key;
}

/**
 * Reads the seeker wallet keypair from SecureStore.
 * Fast path: reads stealf_private_key directly.
 * Fallback: derives from stealf_wallet_mnemonic (for restored wallets).
 * Throws if neither is available.
 */
async function readColdWalletKeypair(): Promise<Keypair> {
  // Fast path — private key stored directly
  const stored = await SecureStore.getItemAsync(COLD_WALLET_STORE_KEY);
  if (stored) {
    return Keypair.fromSecretKey(bs58.decode(stored));
  }

  // Fallback — derive from mnemonic
  const mnemonic = await SecureStore.getItemAsync(MNEMONIC_STORE_KEY);
  if (mnemonic) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const key = deriveKeyFromSeed(new Uint8Array(seed));
    const keypair = Keypair.fromSeed(key);
    // Cache the private key for future fast access
    await SecureStore.setItemAsync(COLD_WALLET_STORE_KEY, bs58.encode(keypair.secretKey), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return keypair;
  }

  throw new Error(
    "[ColdWallet] Key not found in SecureStore. Please set up your wallet first."
  );
}

/**
 * Convert a base58 Solana address to hex-encoded public key.
 */
export function base58ToHex(base58Address: string): string {
  const bytes = bs58.decode(base58Address);
  return Buffer.from(bytes).toString("hex");
}

/**
 * Convert a base64-encoded address to base58.
 */
export function base64ToBase58(base64Address: string): string {
  const bytes = Buffer.from(base64Address, "base64");
  return bs58.encode(bytes);
}

/**
 * Cold wallet bridge interface.
 * Implements SolanaWalletInterface for Turnkey WalletStamper
 * plus transaction signing methods for privacy transactions.
 */
export interface MWAWalletBridge extends SolanaWalletInterface {
  signTransaction(serializedTx: Uint8Array): Promise<Uint8Array>;
  signAndSendTransaction(
    serializedTx: Uint8Array,
    rpcEndpoint: string
  ): Promise<string>;
}

/**
 * Creates a local cold wallet bridge that signs transactions using the private key
 * stored in SecureStore — no external app required.
 * Works on iOS (Keychain) and Android (Keystore).
 *
 * @param publicKeyBase58 - The seeker wallet public address in base58 format
 */
export function createColdWallet(publicKeyBase58: string): MWAWalletBridge {
  return {
    type: WalletType.Solana,

    async getPublicKey(): Promise<string> {
      return base58ToHex(publicKeyBase58);
    },

    async signMessage(message: string): Promise<string> {
      const keypair = await readColdWalletKeypair();
      const messageBytes = new TextEncoder().encode(message);
      const signature = ed25519.sign(messageBytes, keypair.secretKey.slice(0, 32));
      return Buffer.from(signature).toString("hex");
    },

    async signTransaction(serializedTx: Uint8Array): Promise<Uint8Array> {
      const keypair = await readColdWalletKeypair();
      const tx = Transaction.from(Buffer.from(serializedTx));
      tx.partialSign(keypair);
      return new Uint8Array(
        tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      );
    },

    async signAndSendTransaction(
      serializedTx: Uint8Array,
      rpcEndpoint: string
    ): Promise<string> {
      const keypair = await readColdWalletKeypair();
      const tx = Transaction.from(Buffer.from(serializedTx));
      tx.partialSign(keypair);
      const connection = new Connection(rpcEndpoint, "confirmed");
      const rawTx = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      return connection.sendRawTransaction(rawTx);
    },
  };
}
