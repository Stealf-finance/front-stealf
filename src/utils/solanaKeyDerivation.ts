import { Keypair } from "@solana/web3.js";
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
 * Get the privacy wallet Keypair from cache (private key or mnemonic).
 */
export async function getPrivacyKeypair(): Promise<Keypair> {
  const storedKey = await walletKeyCache.getPrivateKey();
  if (storedKey) {
    return Keypair.fromSecretKey(bs58.decode(storedKey));
  }
  const storedMnemonic = walletKeyCache.getMnemonic();
  if (storedMnemonic) {
    const seed = await bip39.mnemonicToSeed(storedMnemonic);
    const { key } = derivePath("m/44'/501'/0'/0'", new Uint8Array(seed));
    return Keypair.fromSeed(key);
  }
  throw new Error('No privacy wallet key found');
}
