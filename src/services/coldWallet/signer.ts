/**
 * ColdWalletSigner - ISigner implementation for Umbra SDK compatibility
 *
 * Task 7.2: Implements the ISigner interface for local transaction signing
 */

import { Keypair, VersionedTransaction, Transaction } from '@solana/web3.js';
import nacl from 'tweetnacl';

/**
 * Signature type (64 bytes)
 */
export type SolanaSignature = Uint8Array;

/**
 * ISigner interface - Compatible with Umbra SDK
 */
export interface ISigner {
  signMessage(message: Uint8Array): Promise<SolanaSignature>;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  signTransactions(txs: VersionedTransaction[]): Promise<VersionedTransaction[]>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  getPublicKey(): Promise<string>;
}

/**
 * ColdWalletSigner - Signs transactions locally using the keypair in memory
 *
 * This class wraps a Solana Keypair and provides signing capabilities
 * compatible with the Umbra SDK ISigner interface.
 */
export class ColdWalletSigner implements ISigner {
  private keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  /**
   * Sign an arbitrary message
   */
  async signMessage(message: Uint8Array): Promise<SolanaSignature> {
    return nacl.sign.detached(message, this.keypair.secretKey);
  }

  /**
   * Sign a versioned transaction
   */
  async signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    tx.sign([this.keypair]);
    return tx;
  }

  /**
   * Sign multiple versioned transactions
   */
  async signTransactions(txs: VersionedTransaction[]): Promise<VersionedTransaction[]> {
    return txs.map(tx => {
      tx.sign([this.keypair]);
      return tx;
    });
  }

  /**
   * Sign multiple legacy transactions
   */
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map(tx => {
      tx.partialSign(this.keypair);
      return tx;
    });
  }

  /**
   * Get the public key (base58 encoded)
   */
  async getPublicKey(): Promise<string> {
    return this.keypair.publicKey.toBase58();
  }

  /**
   * Get the raw Keypair (use with caution)
   */
  getKeypair(): Keypair {
    return this.keypair;
  }
}

/**
 * Create a ColdWalletSigner from a keypair
 */
export function createSigner(keypair: Keypair): ColdWalletSigner {
  return new ColdWalletSigner(keypair);
}

/**
 * Sign and send a transaction using the cold wallet
 *
 * @param transaction - The transaction to sign
 * @param keypair - The keypair to sign with
 * @param connection - Solana connection
 * @returns Transaction signature
 */
export async function signAndSendTransaction(
  transaction: VersionedTransaction,
  keypair: Keypair,
  sendTransaction: (tx: VersionedTransaction) => Promise<string>
): Promise<string> {
  // Sign the transaction locally
  transaction.sign([keypair]);

  // Send the signed transaction
  const signature = await sendTransaction(transaction);

  return signature;
}

export default ColdWalletSigner;
