import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
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
  sendAndConfirmTransactionFactory,
  assertIsTransactionWithinSizeLimit,
  createSignerFromBase58,
  getRpcSubscriptions,
} from '../../services/solana/kit';
import { getTransactionEncoder } from '@solana/kit';
import { guardTransaction } from '../../services/solana/transactionsGuard';
import { walletKeyCache } from '../../services/cache/walletKeyCache';

const SYSTEM_PROGRAM = toAddress('11111111111111111111111111111111');
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';

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
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

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

export async function transactionSimple(
  fromAddress: string,
  recipientAddress: string,
  amount: number,
): Promise<string> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) throw new Error('No stealf_wallet key — wallet setup required');

  const signer = await createSignerFromBase58(privateKeyB58);
  const rpc = getRpc();
  const rpcSubscriptions = getRpcSubscriptions();

  const { message, latestBlockhash } = await buildTransactionMessage(fromAddress, recipientAddress, amount);
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
}

export function useSendTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signTurnkey = transactionTurnkey();

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

      const txId = walletType === 'stealf'
        ? await transactionSimple(fromAddress, recipientAddress, amount)
        : await signTurnkey(fromAddress, recipientAddress, amount);

      return txId;
    } catch (error: any) {
      if (__DEV__ && !error.isGuard) {
        console.error('[useSendTransaction] Transaction error:', error.message);
      }
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { sendTransaction, loading, error };
}
