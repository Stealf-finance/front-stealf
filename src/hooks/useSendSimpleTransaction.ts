import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import { guardTransaction } from '../services/transactionsGuard';
import { useAuth } from '../contexts/AuthContext';
import { useAuthenticatedApi } from '../services/clientStealf';
import { createColdWallet } from '../services/solanaWalletBridge';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const connection = new Connection(RPC_ENDPOINT, "confirmed");

export function useSendTransaction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signAndSendTransaction, wallets } = useTurnkey();
    const { isWalletAuth, userData } = useAuth();
    const api = useAuthenticatedApi();

    const sendTransaction = async (
        fromAddress: string,
        toAddress: string,
        amount: number,
        tokenMint?: string | null,
        tokenDecimals?: number,
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

            // For passkey auth, find the Turnkey wallet account
            let walletAccount: any = null;
            if (!isWalletAuth) {
                const wallet = wallets?.[0];
                walletAccount = wallet?.accounts?.find(
                    (account: any) => account.address === fromAddress
                );

                if (!walletAccount) {
                    throw new Error(`Wallet account not found for address: ${fromAddress}`);
                }
            }

            const fromPubkey = new PublicKey(fromAddress);
            const toPubkey = new PublicKey(toAddress);

            const { blockhash } = await connection.getLatestBlockhash('confirmed');

            const transaction = new Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;

            if (!tokenMint) {
                // Native SOL transfer
                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey,
                        toPubkey,
                        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
                    })
                );
            } else {
                // SPL Token transfer
                const mintPubkey = new PublicKey(tokenMint);
                const decimals = tokenDecimals ?? 9;
                const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

                const sourceATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
                const destinationATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);

                // Check if destination ATA exists, create it if not
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

            __DEV__ && console.log('[useSendTransaction] Transaction built, serializing...');
            const serializedTx = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
            });
            __DEV__ && console.log('[useSendTransaction] Serialized, length:', serializedTx.length);

            let txId: string;

            if (isWalletAuth) {
                const isSeekerWallet = fromAddress === userData?.stealf_wallet;

                if (isSeekerWallet) {
                    // Seeker wallet: sign locally via cold wallet
                    __DEV__ && console.log('[useSendTransaction] Cold wallet path...');
                    const bridge = createColdWallet(fromAddress);
                    const signedBytes = await bridge.signTransaction(new Uint8Array(serializedTx));
                    txId = await connection.sendRawTransaction(signedBytes, {
                        skipPreflight: false,
                        preflightCommitment: 'confirmed',
                    });
                } else {
                    // Cash wallet (Turnkey): sign via backend
                    __DEV__ && console.log('[useSendTransaction] Turnkey backend path...');
                    const hexTx = Buffer.from(serializedTx).toString('hex');
                    const result = await api.post('/api/wallet/sign-and-send', {
                        unsignedTransaction: hexTx,
                    });
                    txId = result.txSignature;
                }
                __DEV__ && console.log('[useSendTransaction] Transaction sent:', txId);
            } else {
                // Passkey auth: sign via Turnkey
                const hexTx = serializedTx.toString('hex');
                txId = await signAndSendTransaction({
                    walletAccount,
                    unsignedTransaction: hexTx,
                    transactionType: "TRANSACTION_TYPE_SOLANA",
                    rpcUrl: RPC_ENDPOINT,
                });
            }

            return txId;
        } catch (error: any){
            if (!error.isGuard) {
                __DEV__ && console.error('[useSendTransaction] Transaction error:', error.message);
            }
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { sendTransaction, loading, error };
}