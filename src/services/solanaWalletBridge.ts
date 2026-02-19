import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { WalletType, SolanaWalletInterface } from "@turnkey/wallet-stamper";
import bs58 from "bs58";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";

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
