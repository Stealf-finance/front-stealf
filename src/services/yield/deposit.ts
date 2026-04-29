import {
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import { sha256 } from "@noble/hashes/sha256";
import { useState } from 'react';
import {
  getRpc,
  getRpcSubscriptions,
  toAddress,
  LAMPORTS_PER_SOL,
  AccountRole,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  assertIsTransactionWithinSizeLimit,
  createSignerFromBase58,
} from '../solana/kit';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthenticatedApi } from '../../hooks/api/useApi';
import { STEALF_JITO_VAULT } from '../../constants/solana';
import { validateBalance } from '../solana/transactionsGuard';
import { walletKeyCache } from '../cache/walletKeyCache';
import { VersionedTransaction } from '@solana/web3.js';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import * as SecureStore from 'expo-secure-store';
import { MWA_AUTH_TOKEN_KEY } from '../../constants/walletAuth';
import { getTransactionEncoder } from '@solana/kit';
import { getStealfWalletType } from '../wallet/stealfWalletType';

const SYSTEM_PROGRAM = toAddress('11111111111111111111111111111111');
const MEMO_PROGRAM = toAddress('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface DepositMemo {
  hashUserId: Buffer;
  ephemeralPublicKey: Uint8Array;
  nonce: Buffer;
  ciphertext: number[];
}

function u128ToLE(value: bigint): Buffer {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(value & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
  buf.writeBigUInt64LE(value >> BigInt(64), 8);
  return buf;
}

function uuidToBigInt(uuid: string): bigint {
  return BigInt('0x' + uuid.replace(/-/g, ''));
}

export function getUserIdHash(subOrgId: string): Buffer {
  const userId = uuidToBigInt(subOrgId);
  return Buffer.from(sha256(u128ToLE(userId)));
}

function encryptDepositMemo(mxePublicKey: Uint8Array, subOrgId: string) {
  const userId = uuidToBigInt(subOrgId);

  const ephemeralPrivateKey = x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  const nonce = randomBytes(16);
  const ciphertext = cipher.encrypt([userId], nonce);

  return {
    ephemeralPublicKey,
    nonce,
    ciphertext: ciphertext[0],
  };
}

function serializeDepositMemo(memo: DepositMemo): string {
  const hashHex = memo.hashUserId.toString('hex');
  const ephPubHex = Buffer.from(memo.ephemeralPublicKey).toString('hex');
  const nonceHex = memo.nonce.toString('hex');
  const ciphertextHex = Buffer.from(memo.ciphertext).toString('hex');

  return JSON.stringify({
    hashUserId: hashHex,
    ephemeralPublicKey: ephPubHex,
    nonce: nonceHex,
    ciphertext: ciphertextHex,
  });
}

function encodeTransferLamports(lamportsAmount: bigint): Uint8Array {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // instruction index 2 = transfer
  view.setBigUint64(4, lamportsAmount, true);
  return data;
}

const STEALF_IDENTITY = {
  name: 'Stealf',
  uri: 'https://stealf.xyz' as `${string}://${string}`,
  icon: 'favicon.ico' as const,
};

const SOLANA_CHAIN = (
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL?.includes('devnet')
    ? 'solana:devnet'
    : 'solana:mainnet'
) as 'solana:devnet' | 'solana:mainnet';

/**
 * Sign + send a yield deposit transaction via the Seeker Seed Vault.
 * Mirrors the MWA path used by transactionMWA: split reauthorize/authorize
 * sessions to avoid CancellationException, persist rotated auth_token.
 */
async function signAndSendYieldDepositMWA(versionedTx: VersionedTransaction): Promise<string> {
  const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const storedToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);

  const inner = async (wallet: Web3MobileWallet, didReauth: boolean) => {
    if (!didReauth) {
      const auth = await wallet.authorize({ chain: SOLANA_CHAIN, identity: STEALF_IDENTITY });
      if (auth?.auth_token) {
        await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
      }
    }
    const sigs = await wallet.signAndSendTransactions({ transactions: [versionedTx] });
    return sigs[0];
  };

  if (storedToken) {
    try {
      return await transact(async (wallet: Web3MobileWallet) => {
        const auth = await wallet.reauthorize({ auth_token: storedToken, identity: STEALF_IDENTITY });
        if (auth?.auth_token && auth.auth_token !== storedToken) {
          await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, auth.auth_token);
        }
        return inner(wallet, true);
      });
    } catch (e: any) {
      if (__DEV__) console.warn('[useYieldDeposit] reauthorize session failed:', e?.message);
      // Preserve the auth_token on user-driven cancellations (Back / Close
      // on the Seed Vault popup). Only nuke it for actual auth failures —
      // otherwise every accidental dismiss forces the user through a full
      // authorize() popup on the next try.
      const msg = (e?.message || '').toString();
      const cancelled = /cancel|declined|denied|user.*reject|back.*pressed/i.test(msg);
      if (cancelled) throw e;
      await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
    }
  }

  return await transact(async (wallet: Web3MobileWallet) => inner(wallet, false));
}

export function useYieldDeposit() {
  const { userData } = useAuth();
  const api = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = async (amount: number): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const subOrgId = userData?.subOrgId;
      const stealfWallet = userData?.stealf_wallet;

      if (__DEV__) console.log('[useYieldDeposit] userData:', JSON.stringify({
        hasSubOrgId: !!subOrgId,
        hasStealfWallet: !!stealfWallet,
        hasCashWallet: !!userData?.cash_wallet,
        authMethod: (userData as any)?.authMethod,
      }));

      if (!subOrgId) throw new Error('Session expired — please sign in again');
      if (!stealfWallet) throw new Error('Stealth wallet not set up — open the Stealth tab to create it');

      const mxeData = await api.get('/api/yield/mxe-pubkey');
      if (__DEV__) console.log('[useYieldDeposit] mxe-pubkey:', mxeData);
      const mxePublicKey = new Uint8Array(mxeData.mxePublicKey);

      const hashUserId = getUserIdHash(subOrgId);
      const { ephemeralPublicKey, nonce, ciphertext } = encryptDepositMemo(mxePublicKey, subOrgId);
      const memo: DepositMemo = { hashUserId, ephemeralPublicKey, nonce, ciphertext };

      // Check balance
      const rpc = getRpc();
      const { value: balanceLamports } = await rpc.getBalance(toAddress(stealfWallet)).send();
      const balanceSOL = Number(balanceLamports) / LAMPORTS_PER_SOL;
      const balanceCheck = validateBalance(amount, balanceSOL);
      if (!balanceCheck.valid) throw new Error(balanceCheck.error);

      // Build transaction
      const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: 'finalized' }).send();
      const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));

      const transferInstruction = {
        programAddress: SYSTEM_PROGRAM,
        accounts: [
          { address: toAddress(stealfWallet), role: AccountRole.WRITABLE_SIGNER as const },
          { address: toAddress(STEALF_JITO_VAULT), role: AccountRole.WRITABLE as const },
        ],
        data: encodeTransferLamports(amountLamports),
      };

      const memoString = serializeDepositMemo(memo);
      const memoInstruction = {
        programAddress: MEMO_PROGRAM,
        accounts: [
          { address: toAddress(stealfWallet), role: AccountRole.WRITABLE_SIGNER as const },
        ],
        data: new TextEncoder().encode(memoString),
      };

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(toAddress(stealfWallet), tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([transferInstruction, memoInstruction], tx),
      );

      const compiled = compileTransaction(message);
      let signature: string;

      const stealfType = await getStealfWalletType();

      if (stealfType === 'mwa') {
        // Stealth wallet IS the Seeker Seed Vault. Sign+send via MWA
        // (signAndSendTransactions broadcasts on-chain in the same session).
        const wireBytes = getTransactionEncoder().encode(compiled);
        const versionedTx = VersionedTransaction.deserialize(new Uint8Array(wireBytes));
        signature = await signAndSendYieldDepositMWA(versionedTx);
        if (__DEV__) console.log('[useYieldDeposit] MWA signature:', signature);
      } else {
        // Local BIP39 keypair from SecureStore.
        const privateKeyB58 = await walletKeyCache.getPrivateKey();
        if (!privateKeyB58) throw new Error('No stealf_wallet key — wallet setup required');

        const signer = await createSignerFromBase58(privateKeyB58);
        const signed = await signTransaction([signer.keyPair], compiled);
        assertIsTransactionWithinSizeLimit(signed);

        signature = getSignatureFromTransaction(signed);
        if (__DEV__) console.log('[useYieldDeposit] sending TX:', signature);

        // Send transaction via raw RPC (WebSocket is flaky on Android Helius).
        const { getBase64EncodedWireTransaction } = await import('@solana/kit');
        const wireTx = getBase64EncodedWireTransaction(signed);
        await rpc.sendTransaction(wireTx, {
          encoding: 'base64',
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        } as any).send();
      }

      // Poll signature status until confirmed (max 60s).
      const start = Date.now();
      const TIMEOUT_MS = 60_000;
      while (Date.now() - start < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 1500));
        const { value } = await rpc.getSignatureStatuses([signature] as any).send();
        const status = value?.[0];
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
          break;
        }
      }
      if (Date.now() - start >= TIMEOUT_MS) {
        throw new Error('Transaction confirmation timed out — check wallet balance before retrying');
      }

      // Only the local-keypair path needs the cache TTL refresh.
      if (stealfType !== 'mwa') walletKeyCache.touch();

      return signature;
    } catch (err: any) {
      if (__DEV__) console.error('[useYieldDeposit] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deposit, loading, error };
}
