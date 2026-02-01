import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { guardTransaction } from '../services/transactionsGuard';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const connection = new Connection(RPC_ENDPOINT, "confirmed");

export function useSendTransaction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signAndSendTransaction, wallets } = useTurnkey();

    const sendTransaction = async (
        fromAddress: string,
        toAddress: string,
        amountSOL: number,
    ) => {
        setLoading(true);
        setError(null);

        try {
            const guard = guardTransaction({
                fromAddress,
                toAddress,
                amount: amountSOL.toString(),
                amountSOL,
            });

            if (!guard.valid) {
                const err = new Error(guard.error);
                (err as any).isGuard = true;
                throw err;
            }

            const wallet = wallets?.[0];

            const walletAccount = wallet?.accounts?.find(
                account => account.address === fromAddress
            );

            if (!walletAccount) {
                throw new Error(`Wallet account not found for address: ${fromAddress}`);
            }

            const fromPubkey = new PublicKey(fromAddress);
            const toPubkey = new PublicKey(toAddress);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const transaction = new Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
                })
            );

            const serializedTx = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
            });
            const hexTx = serializedTx.toString('hex');

            const txId = await signAndSendTransaction({
                walletAccount,
                unsignedTransaction: hexTx,
                transactionType: "TRANSACTION_TYPE_SOLANA",
                rpcUrl: RPC_ENDPOINT,
            });

            return txId;
        } catch (error: any){
            if (!error.isGuard) {
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