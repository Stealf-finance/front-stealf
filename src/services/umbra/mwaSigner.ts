import { address, type Address } from '@solana/kit';
import { getTransactionEncoder, getTransactionDecoder } from '@solana/transactions';
import { VersionedTransaction } from '@solana/web3.js';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import * as SecureStore from 'expo-secure-store';
import { MWA_AUTH_TOKEN_KEY } from '../../constants/walletAuth';

// @umbra-privacy/sdk v1 doesn't re-export its full type surface, so mirror
// what we need locally and cast at the boundary.
type SignableTransaction = any;
type SignedTransaction = any;
type IUmbraSigner = {
  address: Address;
  signTransaction: (tx: SignableTransaction) => Promise<SignedTransaction>;
  signTransactions: (txs: readonly SignableTransaction[]) => Promise<SignedTransaction[]>;
  signMessage: (message: Uint8Array) => Promise<{
    message: Uint8Array;
    signature: Uint8Array;
    signer: Address;
  }>;
};

const STEALF_IDENTITY = {
  name: 'Stealf',
  uri: 'https://stealf.xyz' as `${string}://${string}`,
  icon: 'favicon.ico' as const,
};

const SOLANA_CHAIN = (
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL?.includes('devnet') ? 'solana:devnet' : 'solana:mainnet'
) as 'solana:devnet' | 'solana:mainnet';

export interface CreateMWAUmbraSignerArgs {
  /** Base58 Solana address of the MWA wallet (= stealf_wallet for Seeker users). */
  walletAddress: string;
}

async function openSession<T>(fn: (wallet: Web3MobileWallet) => Promise<T>): Promise<T> {
  const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const storedToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);

  if (storedToken) {
    try {
      if (__DEV__) console.log('[mwaSigner] opening reauthorize session');
      const r = await transact(async (wallet: Web3MobileWallet) => {
        const auth = await wallet.reauthorize({
          auth_token: storedToken,
          identity: STEALF_IDENTITY,
        });
        if (__DEV__) console.log('[mwaSigner] reauthorize OK, token rotated:', auth?.auth_token !== storedToken);
        if (auth?.auth_token && auth.auth_token !== storedToken) {
          await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
        }
        if (__DEV__) console.log('[mwaSigner] running fn() inside reauth session');
        const out = await fn(wallet);
        if (__DEV__) console.log('[mwaSigner] fn() returned in reauth session');
        return out;
      });
      return r;
    } catch (e: any) {
      if (__DEV__) console.warn('[mwaSigner] reauthorize session failed:', e?.message, e?.code);
      await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
    }
  }

  if (__DEV__) console.log('[mwaSigner] opening authorize session (fresh)');
  return await transact(async (wallet: Web3MobileWallet) => {
    const auth = await wallet.authorize({ chain: SOLANA_CHAIN, identity: STEALF_IDENTITY });
    if (__DEV__) console.log('[mwaSigner] authorize OK');
    if (auth?.auth_token) {
      await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
    }
    if (__DEV__) console.log('[mwaSigner] running fn() inside auth session');
    const out = await fn(wallet);
    if (__DEV__) console.log('[mwaSigner] fn() returned in auth session');
    return out;
  });
}

/**
 * IUmbraSigner backed by the Seeker Seed Vault via MWA. Each signing call
 * opens a new transact session → user confirms each Umbra action with a
 * fingerprint + double-tap.
 */
export function createMWAUmbraSigner(args: CreateMWAUmbraSignerArgs): any {
  const signerAddress: Address = address(args.walletAddress);
  const encoder = getTransactionEncoder();
  const decoder = getTransactionDecoder();

  const signManyTx = async (txs: readonly SignableTransaction[]): Promise<SignedTransaction[]> => {
    if (__DEV__) console.log('[mwaSigner] signTransactions — count:', txs.length);
    const versionedTxs = txs.map((tx) => {
      const wire = encoder.encode(tx) as Uint8Array;
      const vtx = VersionedTransaction.deserialize(new Uint8Array(wire));
      if (__DEV__) {
        console.log('[mwaSigner] tx[0] details:', {
          version: vtx.version,
          numInstructions: vtx.message.compiledInstructions.length,
          numAccountKeys: vtx.message.staticAccountKeys.length,
          hasALTs: (vtx.message as any).addressTableLookups?.length || 0,
          serializedSize: wire.length,
          feePayer: vtx.message.staticAccountKeys[0]?.toBase58(),
          signerAddress: args.walletAddress,
        });
      }
      return vtx;
    });

    const signed = await openSession(async (wallet) => {
      if (__DEV__) console.log('[mwaSigner] calling wallet.signTransactions');
      try {
        const result = await wallet.signTransactions({ transactions: versionedTxs });
        if (__DEV__) console.log('[mwaSigner] signTransactions returned', result.length, 'sigs');
        return result;
      } catch (e: any) {
        if (__DEV__) console.error('[mwaSigner] signTransactions threw:', e?.message, e?.code, e?.stack);
        throw e;
      }
    });

    return signed.map((vTx, i) => {
      const signedBytes = vTx.serialize();
      const decoded = decoder.decode(new Uint8Array(signedBytes)) as any;
      return {
        ...decoded,
        lifetimeConstraint: (txs[i] as any).lifetimeConstraint,
      } as SignedTransaction;
    });
  };

  const signOneTx = async (tx: SignableTransaction): Promise<SignedTransaction> => {
    const [signed] = await signManyTx([tx]);
    return signed;
  };

  const signOneMessage = async (message: Uint8Array) => {
    if (__DEV__) console.log('[mwaSigner] signMessage — bytes:', message.length);
    const signatures = await openSession(async (wallet) => {
      if (__DEV__) console.log('[mwaSigner] calling wallet.signMessages');
      const result = await wallet.signMessages({
        addresses: [args.walletAddress],
        payloads: [message],
      });
      if (__DEV__) console.log('[mwaSigner] signMessages returned', result.length, 'sigs');
      return result;
    });

    const signature = signatures[0];
    return {
      message,
      signature: new Uint8Array(signature),
      signer: signerAddress,
    };
  };

  const signer: IUmbraSigner = {
    address: signerAddress,
    signTransaction: signOneTx,
    signTransactions: signManyTx,
    signMessage: signOneMessage,
  };

  return signer;
}
