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

      if (!subOrgId || !stealfWallet) throw new Error('User not authenticated');
      if (__DEV__) console.log('[useYieldDeposit] subOrgId:', subOrgId);

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

      // Sign and send with stealf_wallet
      const privateKeyB58 = await walletKeyCache.getPrivateKey();
      if (!privateKeyB58) throw new Error('No stealf_wallet key — wallet setup required');

      const signer = await createSignerFromBase58(privateKeyB58);
      const rpcSubscriptions = getRpcSubscriptions();

      const compiled = compileTransaction(message);
      const signed = await signTransaction([signer.keyPair], compiled);
      assertIsTransactionWithinSizeLimit(signed);

      const sendAndConfirm = sendAndConfirmTransactionFactory({
        rpc: rpc as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpc'],
        rpcSubscriptions: rpcSubscriptions as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpcSubscriptions'],
      });
      const signature = getSignatureFromTransaction(signed);
      await sendAndConfirm(signed, { commitment: 'confirmed' });

      walletKeyCache.touch();

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
