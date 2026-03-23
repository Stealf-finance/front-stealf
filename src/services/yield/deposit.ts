import {
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import { sha256 } from "@noble/hashes/sha256";
import { useState } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
import { useAuth } from '../../contexts/AuthContext';
import { useAuthenticatedApi } from '../api/clientStealf';
import { transactionSimple } from '../../hooks/transactions/useSendSimpleTransaction';
import { STEALF_JITO_VAULT } from '../../constants/solana';
import { validateBalance } from '../solana/transactionsGuard';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const connection = new Connection(RPC_ENDPOINT, "confirmed");

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

      const fromPubkey = new PublicKey(stealfWallet);
      const balanceLamports = await connection.getBalance(fromPubkey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      const balanceCheck = validateBalance(amount, balanceSOL);
      if (!balanceCheck.valid) throw new Error(balanceCheck.error);

      const toPubkey = new PublicKey(STEALF_JITO_VAULT);
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );

      transaction.add(
        createMemoInstruction(serializeDepositMemo(memo), [fromPubkey])
      );

      const txId = await transactionSimple(transaction);

      return txId;
    } catch (err: any) {
      console.error('[useYieldDeposit] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deposit, loading, error };
}
