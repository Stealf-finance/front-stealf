import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import * as SecureStore from 'expo-secure-store';
import { VersionedTransaction } from '@solana/web3.js';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  getRpc,
  toAddress,
  LAMPORTS_PER_SOL,
  AccountRole,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  assertIsTransactionWithinSizeLimit,
  createSignerFromBase58,
} from '../../services/solana/kit';
import { getTransactionEncoder } from '@solana/kit';
import { guardTransaction } from '../../services/solana/transactionsGuard';
import { walletKeyCache } from '../../services/cache/walletKeyCache';
import { useAuth } from '../../contexts/AuthContext';
import { MWA_AUTH_TOKEN_KEY } from '../../constants/walletAuth';

const SYSTEM_PROGRAM = toAddress('11111111111111111111111111111111');
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';

const STEALF_IDENTITY = {
  name: 'Stealf',
  uri: 'https://stealf.xyz' as `${string}://${string}`,
  icon: 'favicon.ico' as const,
};

const SOLANA_CHAIN = (
  RPC_ENDPOINT.includes('devnet') ? 'solana:devnet' : 'solana:mainnet'
) as 'solana:devnet' | 'solana:mainnet';

function encodeTransferLamports(lamportsAmount: bigint): Uint8Array {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // instruction index 2 = transfer
  view.setBigUint64(4, lamportsAmount, true);
  return data;
}

async function buildTransactionMessage(
  fromAddress: string,
  recipientAddress: string,
  amount: number,
) {
  const rpc = getRpc();
  const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: 'finalized' }).send();

  const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));

  const transferInstruction = {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: toAddress(fromAddress), role: AccountRole.WRITABLE_SIGNER as const },
      { address: toAddress(recipientAddress), role: AccountRole.WRITABLE as const },
    ],
    data: encodeTransferLamports(amountLamports),
  };

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(toAddress(fromAddress), tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstruction(transferInstruction, tx),
  );

  return { message, latestBlockhash };
}

export function transactionTurnkey() {
  const { signAndSendTransaction, wallets } = useTurnkey();

  return async (fromAddress: string, recipientAddress: string, amount: number): Promise<string> => {
    const wallet = wallets?.[0];
    const walletAccount = wallet?.accounts?.find(
      account => account.address === fromAddress
    );
    if (!walletAccount) throw new Error(`Wallet account not found for address: ${fromAddress}`);

    const { message } = await buildTransactionMessage(fromAddress, recipientAddress, amount);
    const compiled = compileTransaction(message);
    const wireBytes = getTransactionEncoder().encode(compiled);
    const hexString = Buffer.from(wireBytes).toString('hex');

    const txId = await signAndSendTransaction({
      walletAccount,
      unsignedTransaction: hexString,
      transactionType: "TRANSACTION_TYPE_SOLANA",
      rpcUrl: RPC_ENDPOINT,
    });
    return txId;
  };
}

/**
 * Sign + send a SOL transfer via the Mobile Wallet Adapter (Seeker Seed Vault).
 * Used as the stealth-wallet signing path for users authenticated with their
 * Seeker wallet (authMethod === 'wallet').
 */
export async function transactionMWA(
  fromAddress: string,
  recipientAddress: string,
  amount: number,
): Promise<string> {
  const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

  const { message } = await buildTransactionMessage(fromAddress, recipientAddress, amount);
  const compiled = compileTransaction(message);
  const wireBytes = getTransactionEncoder().encode(compiled);
  const versionedTx = VersionedTransaction.deserialize(new Uint8Array(wireBytes));

  const storedToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);

  // Reauthorize-only attempt. If reauthorize fails inside transact(),
  // calling authorize() in the same session breaks the MWA bridge —
  // bail out, clear the bad token, and retry with a fresh authorize
  // in a NEW transact() session.
  if (storedToken) {
    try {
      return await transact(async (wallet: Web3MobileWallet) => {
        const auth = await wallet.reauthorize({
          auth_token: storedToken,
          identity: STEALF_IDENTITY,
        });
        if (auth?.auth_token && auth.auth_token !== storedToken) {
          await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
        }
        const signatures = await wallet.signAndSendTransactions({ transactions: [versionedTx] });
        return signatures[0];
      });
    } catch (e: any) {
      if (__DEV__) console.warn('[transactionMWA] reauthorize session failed:', e?.message);
      // Preserve the auth_token on user-driven cancellations — only clear
      // it for actual auth failures. Otherwise the user retries and gets
      // the full authorize popup instead of the silent reauthorize path.
      const msg = (e?.message || '').toString();
      const cancelled = /cancel|declined|denied|user.*reject|back.*pressed/i.test(msg);
      if (cancelled) throw e;
      await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
    }
  }

  return await transact(async (wallet: Web3MobileWallet) => {
    const auth = await wallet.authorize({ chain: SOLANA_CHAIN, identity: STEALF_IDENTITY });
    if (auth?.auth_token) {
      await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
    }
    const signatures = await wallet.signAndSendTransactions({ transactions: [versionedTx] });
    return signatures[0];
  });
}

/**
 * Sign + send a SOL transfer from the cash wallet via the backend Turnkey
 * relay (POST /api/sign/cash-transaction). Used by Seeker (wallet-auth)
 * users whose React Native Turnkey SDK has no session.
 */
export async function transactionCashViaBackend(
  fromAddress: string,
  recipientAddress: string,
  amount: number,
): Promise<string> {
  const SecureStore = require('expo-secure-store');
  const { WALLET_SESSION_TOKEN_KEY } = require('../../constants/walletAuth');
  const token = await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY);
  if (!token) throw new Error('Wallet session token missing');

  const { message } = await buildTransactionMessage(fromAddress, recipientAddress, amount);
  const compiled = compileTransaction(message);
  const wireBytes = getTransactionEncoder().encode(compiled);
  const unsignedHex = Buffer.from(wireBytes).toString('hex');

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sign/cash-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ unsignedTransactionHex: unsignedHex }),
  });
  const json = await res.json();
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Backend signing failed');

  const signedHex: string = json.data.signedTransactionHex;
  const signedBytes = new Uint8Array(Buffer.from(signedHex, 'hex'));
  const signedB64 = Buffer.from(signedBytes).toString('base64');

  const rpc = getRpc();
  const signature = await rpc.sendTransaction(signedB64 as any, { encoding: 'base64' }).send();

  for (let i = 0; i < 30; i++) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') break;
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    await new Promise(r => setTimeout(r, 1500));
  }

  return signature;
}

export async function transactionSimple(
  fromAddress: string,
  recipientAddress: string,
  amount: number,
): Promise<string> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) throw new Error('No stealf_wallet key — wallet setup required');

  const signer = await createSignerFromBase58(privateKeyB58);
  const rpc = getRpc();

  const { message, latestBlockhash } = await buildTransactionMessage(fromAddress, recipientAddress, amount);
  const compiled = compileTransaction(message);
  const signed = await signTransaction([signer.keyPair], compiled);
  assertIsTransactionWithinSizeLimit(signed);

  const signature = getSignatureFromTransaction(signed);

  // Send transaction via RPC
  const encodedTx = getBase64EncodedWireTransaction(signed);
  await rpc.sendTransaction(encodedTx, { encoding: 'base64' }).send();

  // Wait for confirmation via polling (WebSocket not supported on React Native)
  for (let i = 0; i < 30; i++) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') break;
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    await new Promise(r => setTimeout(r, 1500));
  }

  walletKeyCache.touch();

  return signature;
}

export function useSendTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signTurnkey = transactionTurnkey();
  const { isWalletAuth } = useAuth();

  const sendTransaction = async (
    fromAddress: string,
    recipientAddress: string,
    amount: number,
    _tokenMint?: string | null,
    _tokenDecimals?: number,
    walletType: 'cash' | 'stealf' = 'cash',
    balanceSOL?: number,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const guard = guardTransaction({
        fromAddress,
        toAddress: recipientAddress,
        amount: amount.toString(),
        amountSOL: amount,
        balanceSOL,
      });

      if (!guard.valid) {
        const err = new Error(guard.error);
        (err as any).isGuard = true;
        throw err;
      }

      // For wallet-auth (Seeker) users the stealth wallet IS the Seed Vault
      // (sign via MWA) and the cash wallet has no in-device Turnkey session
      // (sign via backend relay). Passkey users keep the original paths.
      const stealfSigner = isWalletAuth ? transactionMWA : transactionSimple;
      const cashSigner = isWalletAuth ? transactionCashViaBackend : signTurnkey;

      const txId = walletType === 'stealf'
        ? await stealfSigner(fromAddress, recipientAddress, amount)
        : await cashSigner(fromAddress, recipientAddress, amount);

      return txId;
    } catch (error: any) {
      if (__DEV__ && !error.isGuard) {
        console.error('[useSendTransaction] Transaction error:', error.message);
        console.error('[useSendTransaction] cause:', error?.cause?.message || error?.cause);
        console.error('[useSendTransaction] code:', error?.code);
      }
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { sendTransaction, loading, error };
}
