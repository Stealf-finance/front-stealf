import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import { guardTransaction } from '../../services/solana/transactionsGuard';
import { walletKeyCache } from '../../services/cache/walletKeyCache';
import bs58 from 'bs58';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const connection = new Connection(RPC_ENDPOINT, "confirmed");

async function buildTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    tokenMint?: string | null,
    tokenDecimals?: number,
): Promise<Transaction> {
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);

    const { blockhash } = await connection.getLatestBlockhash('finalized');

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    if (!tokenMint) {
        transaction.add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: Math.floor(amount * LAMPORTS_PER_SOL),
            })
        );
    } else {
        const mintPubkey = new PublicKey(tokenMint);
        const decimals = tokenDecimals ?? 9;
        const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

        const sourceATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const destinationATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);

        try {
            await getAccount(connection, destinationATA);
        } catch {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPubkey,
                    destinationATA,
                    toPubkey,
                    mintPubkey,
                )
            );
        }

        transaction.add(
            createTransferInstruction(
                sourceATA,
                destinationATA,
                fromPubkey,
                tokenAmount,
            )
        );
    }

    return transaction;
}

export function transactionTurnkey() {
    const { signAndSendTransaction, wallets } = useTurnkey();

    return async (transaction: Transaction, fromAddress: string): Promise<string> => {
        const wallet = wallets?.[0];
        console.log('[Turnkey] wallets count:', wallets?.length);
        console.log('[Turnkey] wallet accounts:', wallet?.accounts?.map(a => a.address));
        console.log('[Turnkey] fromAddress:', fromAddress);

        const walletAccount = wallet?.accounts?.find(
            account => account.address === fromAddress
        );
        if (!walletAccount) throw new Error(`Wallet account not found for address: ${fromAddress}`);

        const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        console.log('[Turnkey] serializedTx length:', serializedTx.length);
        console.log('[Turnkey] rpcUrl:', RPC_ENDPOINT);
        console.log('[Turnkey] walletAccount address:', walletAccount.address);

        try {
            const txId = await signAndSendTransaction({
                walletAccount,
                unsignedTransaction: serializedTx.toString('hex'),
                transactionType: "TRANSACTION_TYPE_SOLANA",
                rpcUrl: RPC_ENDPOINT,
            });
            console.log('[Turnkey] txId:', txId);
            return txId;
        } catch (err: any) {
            console.error('[Turnkey] signAndSendTransaction failed:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            throw err;
        }
    };
}

export async function transactionSimple(transaction: Transaction): Promise<string> {
    const privateKeyB58 = await walletKeyCache.getPrivateKey();
    if (!privateKeyB58) throw new Error('No stealf_wallet key — wallet setup required');

    const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));

    const txId = await sendAndConfirmTransaction(connection, transaction, [keypair]);

    walletKeyCache.touch();

    return txId;
}

export function useSendTransaction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const signTurnkey = transactionTurnkey();

    const sendTransaction = async (
        fromAddress: string,
        toAddress: string,
        amount: number,
        tokenMint?: string | null,
        tokenDecimals?: number,
        walletType: 'cash' | 'stealf' = 'cash',
    ) => {
        setLoading(true);
        setError(null);

        try {
            const guard = guardTransaction({
                fromAddress,
                toAddress,
                amount: amount.toString(),
                amountSOL: amount,
            });

            if (!guard.valid) {
                const err = new Error(guard.error);
                (err as any).isGuard = true;
                throw err;
            }

            const transaction = await buildTransaction(fromAddress, toAddress, amount, tokenMint, tokenDecimals);
            const txId = walletType === 'stealf'
                ? await transactionSimple(transaction)
                : await signTurnkey(transaction, fromAddress);

            return txId;
        } catch (error: any) {
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
