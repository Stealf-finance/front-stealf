import { createKeyPairFromBytes, createKeyPairFromPrivateKeyBytes, getAddressFromPublicKey } from "@solana/kit";
import type { Address } from "@solana/kit";
import bs58 from "bs58";
import * as bip39 from "bip39";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { walletKeyCache } from "../services/cache/walletKeyCache";

const HARDENED_OFFSET = 0x80000000;

/**
 * SLIP-0010 ED25519 HD key derivation using @noble/hashes
 */
export function derivePath(path: string, seed: Uint8Array): { key: Uint8Array } {
  const I = hmac(sha512, "ed25519 seed", seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  const segments = path.split("/").slice(1);
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

/**
 * Get the privacy wallet CryptoKeyPair from cache (private key or mnemonic).
 *
 * Handles both legacy 64-byte secret keys (stored by old @solana/web3.js code)
 * and new 32-byte private key seeds.
 */
export async function getPrivacyKeypair(): Promise<CryptoKeyPair> {
  const storedKey = await walletKeyCache.getPrivateKey();
  if (storedKey) {
    const decoded = bs58.decode(storedKey);
    if (decoded.length === 64) {
      // Legacy format: 64 bytes (32 private + 32 public)
      return await createKeyPairFromBytes(decoded);
    }
    // New format: 32-byte private key seed
    return await createKeyPairFromPrivateKeyBytes(decoded);
  }
  const storedMnemonic = walletKeyCache.getMnemonic();
  if (storedMnemonic) {
    const seed = await bip39.mnemonicToSeed(storedMnemonic);
    const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));
    return await createKeyPairFromPrivateKeyBytes(key);
  }
  throw new Error('No privacy wallet key found');
}

/**
 * Get the privacy wallet address (base58) from cache.
 */
export async function getPrivacyAddress(): Promise<Address> {
  const keyPair = await getPrivacyKeypair();
  return await getAddressFromPublicKey(keyPair.publicKey);
}
