import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { WalletType, SolanaWalletInterface } from "@turnkey/wallet-stamper";
import bs58 from "bs58";
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
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
 * Fallback: derives from stealf_wallet_mnemonic (for wallets created before Fix #1).
 * Throws if neither is available.
 */
async function readColdWalletKeypair(): Promise<Keypair> {
  // Fast path — private key stored directly
  const stored = await SecureStore.getItemAsync(COLD_WALLET_STORE_KEY);
  if (stored) {
    return Keypair.fromSecretKey(bs58.decode(stored));
  }

  // Fallback — derive from mnemonic (backward compat for older wallets)
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

const STEALF_IDENTITY = {
  name: "Stealf",
  uri: "https://stealf.xyz" as `${string}://${string}`,
  icon: "favicon.ico" as const,
};

const SOLANA_CHAIN = "solana:devnet" as const;

/**
 * Convert a base58 Solana address to hex-encoded public key.
 */
export function base58ToHex(base58Address: string): string {
  const bytes = bs58.decode(base58Address);
  return Buffer.from(bytes).toString("hex");
}

/**
 * Convert a base64-encoded address (from MWA) to base58.
 */
export function base64ToBase58(base64Address: string): string {
  const bytes = Buffer.from(base64Address, "base64");
  return bs58.encode(bytes);
}

/**
 * Extended MWA Wallet Bridge interface.
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
 * Authorize with MWA, with fallback from reauth to fresh auth.
 * Saves the new auth_token to SecureStore for future biometric reauth.
 */
async function mwaAuthorize(
  wallet: Web3MobileWallet,
  authToken: string
): Promise<any> {
  let authResult;
  try {
    authResult = await wallet.authorize({
      chain: SOLANA_CHAIN,
      identity: STEALF_IDENTITY,
      auth_token: authToken,
    });
  } catch {
    console.log('[MWA Bridge] Reauth failed, trying fresh authorize...');
    authResult = await wallet.authorize({
      chain: SOLANA_CHAIN,
      identity: STEALF_IDENTITY,
    });
  }

  // Save new auth_token for future biometric reauth
  if (authResult.auth_token) {
    await SecureStore.setItemAsync('mwa_auth_token', authResult.auth_token);
  }

  return authResult;
}

/**
 * Creates a wallet bridge that implements SolanaWalletInterface
 * by delegating to the Seed Vault via MWA transact().
 *
 * @param publicKeyBase58 - The Solana address in base58 format
 * @param authToken - The MWA auth_token for reauthorization
 */
export function createSeedVaultWallet(
  publicKeyBase58: string,
  authToken: string
): MWAWalletBridge {
  return {
    type: WalletType.Solana,

    async getPublicKey(): Promise<string> {
      return base58ToHex(publicKeyBase58);
    },

    async signMessage(message: string): Promise<string> {
      return await transact(async (wallet: Web3MobileWallet) => {
        await mwaAuthorize(wallet, authToken);

        const encoded = new TextEncoder().encode(message);
        const addressBase64 = Buffer.from(
          bs58.decode(publicKeyBase58)
        ).toString("base64");

        const signResult = await (wallet as any).signMessages({
          addresses: [addressBase64],
          payloads: [encoded],
        });
        const signedPayloads = signResult.signed_payloads || signResult;

        return Buffer.from(signedPayloads[0]).toString("hex");
      });
    },

    async signTransaction(serializedTx: Uint8Array): Promise<Uint8Array> {
      return await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await mwaAuthorize(wallet, authToken);
        const authorizedBase58 = authResult.accounts?.[0]?.address
          ? bs58.encode(Buffer.from(authResult.accounts[0].address, 'base64'))
          : 'unknown';
        console.log('[MWA Bridge] Authorized account (base58):', authorizedBase58);
        console.log('[MWA Bridge] Expected signer:', publicKeyBase58);

        const tx = Transaction.from(Buffer.from(serializedTx));
        console.log('[MWA Bridge] TX feePayer:', tx.feePayer?.toBase58());

        // Check if MWA authorized the right account
        if (authorizedBase58 !== publicKeyBase58) {
          console.warn('[MWA Bridge] MISMATCH! Authorized account does not match expected signer');
          console.warn('[MWA Bridge] Authorized:', authorizedBase58);
          console.warn('[MWA Bridge] Expected:', publicKeyBase58);
        }

        const signedTxs = await wallet.signTransactions({
          transactions: [tx],
        });

        const signedTx = signedTxs[0] as Transaction;
        const hasSig = signedTx.signatures.some(s =>
          s.signature != null && !s.signature.every((b: number) => b === 0)
        );
        console.log('[MWA Bridge] Transaction signed:', hasSig);

        if (!hasSig) {
          console.error('[MWA Bridge] Seeker did NOT sign the transaction!');
          console.error('[MWA Bridge] Signatures:', JSON.stringify(signedTx.signatures.map(s => ({
            key: s.publicKey.toBase58(),
            sigPresent: s.signature != null,
            allZeros: s.signature ? s.signature.every((b: number) => b === 0) : true,
          }))));
          throw new Error(
            `Seeker wallet did not sign. Authorized: ${authorizedBase58}, FeePayer: ${tx.feePayer?.toBase58()}`
          );
        }

        return new Uint8Array(signedTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }));
      });
    },

    async signAndSendTransaction(
      serializedTx: Uint8Array,
      rpcEndpoint: string
    ): Promise<string> {
      return await transact(async (wallet: Web3MobileWallet) => {
        await mwaAuthorize(wallet, authToken);

        const tx = Transaction.from(serializedTx);
        const [signature] = await wallet.signAndSendTransactions({
          transactions: [tx],
        });

        return signature;
      });
    },
  };
}

/**
 * Creates a local cold wallet bridge that signs transactions using the private key
 * stored in SecureStore — no external app (Seed Vault) required.
 *
 * Drop-in replacement for createSeedVaultWallet() on any Android device.
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
      // Sign using ed25519 with the seed (first 32 bytes of the 64-byte secretKey)
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
