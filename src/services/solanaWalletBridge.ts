import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { WalletType, SolanaWalletInterface } from "@turnkey/wallet-stamper";
import bs58 from "bs58";
import { Connection } from "@solana/web3.js";

const STEALF_IDENTITY = {
  name: "Stealf",
  uri: "https://stealf.xyz" as `${string}://${string}`,
  icon: "favicon.ico" as const,
};

const SOLANA_CHAIN = "solana:mainnet" as const;

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
        // Reauthorize with stored auth_token to avoid full authorization prompt
        const reauth = await wallet.authorize({
          chain: SOLANA_CHAIN,
          identity: STEALF_IDENTITY,
          auth_token: authToken,
        });

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
        await wallet.authorize({
          chain: SOLANA_CHAIN,
          identity: STEALF_IDENTITY,
          auth_token: authToken,
        });

        const txBase64 = Buffer.from(serializedTx).toString("base64");

        const signResult = await (wallet as any).signTransactions({
          payloads: [txBase64],
        });
        const signedPayloads = signResult.signed_payloads || signResult;

        return new Uint8Array(Buffer.from(signedPayloads[0], "base64"));
      });
    },

    async signAndSendTransaction(
      serializedTx: Uint8Array,
      rpcEndpoint: string
    ): Promise<string> {
      return await transact(async (wallet: Web3MobileWallet) => {
        await wallet.authorize({
          chain: SOLANA_CHAIN,
          identity: STEALF_IDENTITY,
          auth_token: authToken,
        });

        const txBase64 = Buffer.from(serializedTx).toString("base64");

        const sendResult = await (wallet as any).signAndSendTransactions({
          payloads: [txBase64],
          options: {
            commitment: "confirmed",
          },
        });
        const signatures = sendResult.signatures || sendResult;

        return signatures[0];
      });
    },
  };
}
