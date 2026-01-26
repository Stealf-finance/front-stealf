/**
 * TurnkeyWalletAdapter
 * Adapts Turnkey SDK methods for use with SilentSwap
 */

import { Connection, Transaction } from '@solana/web3.js';
import type { TurnkeyWalletAdapter as ITurnkeyWalletAdapter } from '../types/swap';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

export interface TurnkeyWalletAccount {
  address: string;
  path?: string;
}

export interface TurnkeyMethods {
  signAndSendTransaction: (params: {
    walletAccount: TurnkeyWalletAccount;
    unsignedTransaction: string;
    transactionType: string;
    rpcUrl: string;
  }) => Promise<string>;
  signTransaction?: (params: {
    walletAccount: TurnkeyWalletAccount;
    unsignedTransaction: string;
    transactionType: string;
  }) => Promise<string>;
  signRawPayload?: (params: {
    walletAccount: TurnkeyWalletAccount;
    payload: string;
    encoding: string;
  }) => Promise<string>;
}

export class TurnkeyWalletAdapterImpl implements ITurnkeyWalletAdapter {
  public readonly publicKey: string;
  private walletAccount: TurnkeyWalletAccount;
  private turnkeyMethods: TurnkeyMethods;

  constructor(walletAccount: TurnkeyWalletAccount, turnkeyMethods: TurnkeyMethods) {
    this.walletAccount = walletAccount;
    this.turnkeyMethods = turnkeyMethods;
    this.publicKey = walletAccount.address;
  }

  /**
   * Sign a transaction without broadcasting
   * Returns the signed transaction as Uint8Array
   */
  async signTransaction(transaction: Uint8Array): Promise<Uint8Array> {
    try {
      const hexTx = Buffer.from(transaction).toString('hex');

      if (this.turnkeyMethods.signTransaction) {
        const signedHex = await this.turnkeyMethods.signTransaction({
          walletAccount: this.walletAccount,
          unsignedTransaction: hexTx,
          transactionType: 'TRANSACTION_TYPE_SOLANA',
        });
        return new Uint8Array(Buffer.from(signedHex, 'hex'));
      }

      // Fallback: Sign via signAndSendTransaction but intercept
      // This is a limitation - Turnkey may not support sign-only
      throw new Error(
        'signTransaction not available - use signAndSendTransaction instead'
      );
    } catch (error: any) {
      console.error('[TurnkeyWalletAdapter] signTransaction error:', error);
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  }

  /**
   * Sign and broadcast a transaction
   * Returns the transaction signature/ID
   */
  async signAndSendTransaction(transaction: Uint8Array): Promise<string> {
    try {
      const hexTx = Buffer.from(transaction).toString('hex');

      const txId = await this.turnkeyMethods.signAndSendTransaction({
        walletAccount: this.walletAccount,
        unsignedTransaction: hexTx,
        transactionType: 'TRANSACTION_TYPE_SOLANA',
        rpcUrl: RPC_ENDPOINT,
      });

      return txId;
    } catch (error: any) {
      console.error('[TurnkeyWalletAdapter] signAndSendTransaction error:', error);

      if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        throw new Error('USER_REJECTED: Transaction was rejected by user');
      }
      if (error.message?.includes('timeout')) {
        throw new Error('TIMEOUT: Transaction signing timed out');
      }

      throw new Error(`Failed to sign and send transaction: ${error.message}`);
    }
  }

  /**
   * Sign an arbitrary message
   * Returns the signature as Uint8Array
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (this.turnkeyMethods.signRawPayload) {
        const payload = Buffer.from(message).toString('hex');
        const signatureHex = await this.turnkeyMethods.signRawPayload({
          walletAccount: this.walletAccount,
          payload,
          encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
        });
        return new Uint8Array(Buffer.from(signatureHex, 'hex'));
      }

      // Fallback: create a memo transaction with the message
      throw new Error('signMessage not directly supported - implement via transaction');
    } catch (error: any) {
      console.error('[TurnkeyWalletAdapter] signMessage error:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }
}

/**
 * Factory function to create a TurnkeyWalletAdapter
 */
export function createTurnkeyWalletAdapter(
  walletAccount: TurnkeyWalletAccount,
  turnkeyMethods: TurnkeyMethods
): ITurnkeyWalletAdapter {
  return new TurnkeyWalletAdapterImpl(walletAccount, turnkeyMethods);
}
