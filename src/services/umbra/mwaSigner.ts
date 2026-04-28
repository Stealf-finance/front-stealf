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
  const authToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);
  const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

  return transact(async (wallet: Web3MobileWallet) => {
    let auth: any;
    if (authToken) {
      try {
        auth = await wallet.reauthorize({ auth_token: authToken, identity: STEALF_IDENTITY });
      } catch (e) {
        if (__DEV__) console.warn('[mwaSigner] reauthorize failed, falling back to authorize:', (e as any)?.message);
        auth = await wallet.authorize({ chain: SOLANA_CHAIN, identity: STEALF_IDENTITY });
      }
    } else {
      auth = await wallet.authorize({ chain: SOLANA_CHAIN, identity: STEALF_IDENTITY });
    }
    // Seed Vault rotates auth_token on each reauthorize — persist the new
    // one so the next call can reauthorize silently instead of falling back
    // to authorize() with the verify popup.
    if (auth?.auth_token && auth.auth_token !== authToken) {
      await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
    }
    return fn(wallet);
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
    const versionedTxs = txs.map((tx) => {
      const wire = encoder.encode(tx) as Uint8Array;
      return VersionedTransaction.deserialize(new Uint8Array(wire));
    });

    const signed = await openSession(async (wallet) => {
      return wallet.signTransactions({ transactions: versionedTxs });
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
    const signatures = await openSession(async (wallet) => {
      return wallet.signMessages({
        addresses: [args.walletAddress],
        payloads: [message],
      });
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
