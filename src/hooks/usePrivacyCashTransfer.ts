import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import * as privacyCashApi from '../services/privacyCashApi';
import type { PrivateTransfer } from '../types/privacyCash';
import { validateAmount, validateBalance, validateAddress } from '../services/transactionsGuard';
import { useAuth } from '../contexts/AuthContext';
import { createColdWallet } from '../services/solanaWalletBridge';

function guardError(message?: string): Error {
  const err = new Error(message);
  (err as any).isGuard = true;
  return err;
}

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

export function usePrivacyCashTransfer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTransfer, setCurrentTransfer] = useState<PrivateTransfer | null>(null);
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { isWalletAuth } = useAuth();

  /**
   * Initiate private deposit
   */
  const initiatePrivateDeposit = async (
    fromAddress: string,
    amountSOL: number,
    sessionToken: string,
    tokenMint?: string,
    balanceSOL?: number
  ): Promise<PrivateTransfer> => {
    setLoading(true);
    setError(null);

    try {
      const amountCheck = validateAmount(amountSOL.toString());
      if (!amountCheck.valid) throw guardError(amountCheck.error);

      if (balanceSOL !== undefined) {
        const balanceCheck = validateBalance(amountSOL, balanceSOL);
        if (!balanceCheck.valid) throw guardError(balanceCheck.error);
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

      const initiateResponse = await privacyCashApi.initiatePrivateDesposit(
        {
          fromAddress,
          amount: amountSOL,
          tokenMint,
        },
        sessionToken
      );

      const { deposit, instructions } = initiateResponse.data;

      if (!deposit || !instructions) {
        throw new Error('Invalid API response: missing deposit or instructions');
      }

      const transfer: PrivateTransfer = {
        transferId: deposit.depositId || instructions.depositId,
        status: deposit.status || 'pending_vault',
        vaultAddress: deposit.vaultAddress || instructions.vaultAddress,
        destinationWallet: fromAddress,
        amount: deposit.amount || amountSOL,
        tokenMint: deposit.tokenMint,
        fees: deposit.fees || {
          vaultDeposit: 0,
          privacyDeposit: 0,
          privacyWithdraw: 0,
          total: 0,
        },
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
      };

      setCurrentTransfer(transfer);

      const fromPubkey = new PublicKey(fromAddress);
      const vaultPubkey = new PublicKey(instructions.vaultAddress);

      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: vaultPubkey,
          lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
        })
      );

      // Add memo instruction with reference UUID for backend correlation
      const reference = deposit.reference || instructions.reference || instructions.memo;

      if (reference) {
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(reference),
          })
        );
      }

      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      let vaultTxId: string;

      if (isWalletAuth) {
        // Wallet auth: sign and send via cold wallet
        const bridge = createColdWallet(fromAddress);
        vaultTxId = await bridge.signAndSendTransaction(
          new Uint8Array(serializedTx),
          RPC_ENDPOINT
        );
      } else {
        // Passkey auth: sign via Turnkey
        const hexTx = serializedTx.toString('hex');
        vaultTxId = await signAndSendTransaction({
          walletAccount,
          unsignedTransaction: hexTx,
          transactionType: 'TRANSACTION_TYPE_SOLANA',
          rpcUrl: RPC_ENDPOINT,
        });
      }

      return {
        ...transfer,
        transactions: {
          vaultDepositTx: vaultTxId,
        },
      };

    } catch (err: any) {
      if (!err.isGuard) console.error('[PrivacyCash] Transfer error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const initiatePrivateWithdraw = async (
    idWallet: string,
    toAddress: string,
    amountSOL: number,
    sessionToken: string,
    tokenMint?: string
  ): Promise<PrivateTransfer> => {
    setLoading(true);
    setError(null);

    try {
      const addressCheck = validateAddress(toAddress);
      if (!addressCheck.valid) throw guardError(addressCheck.error);

      const amountCheck = validateAmount(amountSOL.toString());
      if (!amountCheck.valid) throw guardError(amountCheck.error);

      const wallet = wallets?.[0];
      const walletAccount = wallet?.accounts?.find(
        account => account.address === idWallet
      );

      if (!walletAccount) {
        throw new Error(`Wallet account not found for address: ${idWallet}`);
      }

      const withdrawRequest = {
        walletID: idWallet,
        destinationWallet: toAddress,
        amount: amountSOL,
        tokenMint: null,
      };

      const initiateResponse = await privacyCashApi.initiatePrivateWithdraw(
        withdrawRequest,
        sessionToken
      );

      const { withdraw, transfer } = initiateResponse.data;
      const withdrawData = withdraw || transfer;

      if (!withdrawData) {
        throw new Error('Invalid API response: missing withdraw data');
      }

      const mappedTransfer: PrivateTransfer = {
        transferId: withdrawData.withdrawId || withdrawData.transferId,
        status: withdrawData.status,
        vaultAddress: '',
        destinationWallet: withdrawData.recipient || withdrawData.destinationWallet,
        amount: withdrawData.amount,
        tokenMint: withdrawData.tokenMint,
        fees: {
          vaultDeposit: 0,
          privacyDeposit: 0,
          privacyWithdraw: withdrawData.fee || 0,
          total: withdrawData.fee || 0,
        },
        transactions: {
          privacyCashWithdrawTx: withdrawData.transactions?.privacyCashWithdrawTx,
        },
        createdAt: withdrawData.createdAt,
        updatedAt: withdrawData.updatedAt,
      };

      setCurrentTransfer(mappedTransfer);

      return mappedTransfer;

    } catch (err: any) {
      if (!err.isGuard) console.error('[PrivacyCash] Transfer error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Récupérer le statut d'un transfert
   */
  const getTransferStatus = async (
    transferId: string,
    sessionToken: string
  ): Promise<PrivateTransfer> => {
    try {
      const response = await privacyCashApi.getTransferStatus(transferId, sessionToken);
      setCurrentTransfer(response.data.transfer);
      return response.data.transfer;
    } catch (err: any) {
      console.error('[PrivacyCash] Get status error:', err);
      throw err;
    }
  };

  return {
    initiatePrivateDeposit,
    initiatePrivateWithdraw,
    getTransferStatus,
    loading,
    error,
    currentTransfer,
  };
}