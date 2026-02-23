/**
 * useStealthTransfer — Hook pour envoyer des paiements stealth.
 *
 * Flux smesh (1 TX directe) :
 *   Cash wallet  → POST /api/stealth/build-and-send-cash (build + sign + send en 1 appel)
 *   Wealth wallet → POST /api/stealth/build-transfer → MWA sign + send
 *
 * Requirements : 2.7, 6.1, 6.2, 6.6
 */

import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Connection } from '@solana/web3.js';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuthenticatedApi } from '../services/clientStealf';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { createSeedVaultWallet } from '../services/solanaWalletBridge';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const _connection = new Connection(RPC_ENDPOINT, 'confirmed');

/** Valide le format meta-adresse : base58 décodé = 64 bytes */
function validateMetaAddress(meta: string): boolean {
  try {
    const bs58 = require('bs58');
    const decoded = bs58.decode(meta);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

export interface StealthSendResult {
  txSignature: string;
  stealthAddress: string;
  ephemeralR: string;
  viewTag: number;
}

interface StealthTransferState {
  isLoading: boolean;
  error: string | null;
  txSignature: string | null;
  send: (recipientMetaAddress: string, amountLamports: bigint, senderAddress: string) => Promise<StealthSendResult | null>;
  reset: () => void;
}

export function useStealthTransfer(): StealthTransferState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const api = useAuthenticatedApi();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { isWalletAuth, userData } = useAuth();
  const { setMWAInProgress } = useSession();

  const send = useCallback(
    async (
      recipientMetaAddress: string,
      amountLamports: bigint,
      senderAddress: string,
    ): Promise<StealthSendResult | null> => {
      if (!validateMetaAddress(recipientMetaAddress)) {
        setError('Format de meta-adresse invalide (base58, 64 bytes attendu)');
        return null;
      }

      setIsLoading(true);
      setError(null);
      setTxSignature(null);

      try {
        console.log('[StealthTransfer] START send', { senderAddress, amountLamports: amountLamports.toString(), isWalletAuth });

        const isCashWallet = isWalletAuth && senderAddress !== userData?.stealf_wallet;
        console.log('[StealthTransfer] isCashWallet:', isCashWallet);

        let txSig: string;
        let stealthAddress: string;
        let ephemeralR: string;
        let viewTag: number;

        if (isCashWallet) {
          // Cash wallet (Turnkey) : build + sign + send en 1 seul appel backend
          console.log('[StealthTransfer] build-and-send-cash...');
          const result = await api.post('/api/stealth/build-and-send-cash', {
            recipientMetaAddress,
            amountLamports: amountLamports.toString(),
            senderPublicKey: senderAddress,
          });
          txSig = result.txSignature;
          stealthAddress = result.stealthAddress;
          ephemeralR = result.ephemeralR;
          viewTag = result.viewTag;
          console.log('[StealthTransfer] build-and-send-cash OK, tx:', txSig?.slice(0, 20));
        } else {
          // Wealth wallet : build TX côté backend, signer localement
          console.log('[StealthTransfer] Calling build-transfer...');
          const buildResult = await api.post('/api/stealth/build-transfer', {
            recipientMetaAddress,
            amountLamports: amountLamports.toString(),
            senderPublicKey: senderAddress,
          });
          console.log('[StealthTransfer] build-transfer OK, stealthAddress:', buildResult?.stealthAddress?.slice(0, 8));

          stealthAddress = buildResult.stealthAddress;
          ephemeralR = buildResult.ephemeralR;
          viewTag = buildResult.viewTag;
          const serializedTxBytes = Buffer.from(buildResult.serializedTx, 'base64');

          if (isWalletAuth) {
            // MWA SeedVault
            console.log('[StealthTransfer] Signing via MWA SeedVault...');
            setMWAInProgress(true);
            try {
              const authToken = await SecureStore.getItemAsync('mwa_auth_token');
              if (!authToken) throw new Error('MWA auth token not found. Please reconnect your wallet.');
              const bridge = createSeedVaultWallet(senderAddress, authToken);
              txSig = await bridge.signAndSendTransaction(
                new Uint8Array(serializedTxBytes),
                RPC_ENDPOINT,
              );
              console.log('[StealthTransfer] MWA sign OK, txSig:', txSig);
              console.log('[StealthTransfer] Explorer: https://explorer.solana.com/tx/' + txSig + '?cluster=devnet');
            } finally {
              setMWAInProgress(false);
            }
          } else {
            // Turnkey passkey
            const wallet = wallets?.[0];
            const walletAccount = wallet?.accounts?.find(
              (account: any) => account.address === senderAddress,
            );
            if (!walletAccount) throw new Error(`Wallet account not found for address: ${senderAddress}`);
            txSig = await signAndSendTransaction({
              walletAccount,
              unsignedTransaction: serializedTxBytes.toString('hex'),
              transactionType: 'TRANSACTION_TYPE_SOLANA',
              rpcUrl: RPC_ENDPOINT,
            });
          }
        }

        // Cash wallet: backend confirme avant de répondre (processed) — pas besoin d'attendre ici
        // Wealth wallet (MWA/passkey): confirmer côté client avant spend TX
        if (!isCashWallet) {
          console.log('[StealthTransfer] Waiting for confirmation (wealth wallet)...');
          const { blockhash, lastValidBlockHeight } = await _connection.getLatestBlockhash('processed');
          await _connection.confirmTransaction({ signature: txSig!, blockhash, lastValidBlockHeight }, 'processed');
          console.log('[StealthTransfer] TX confirmed ✓');
        } else {
          console.log('[StealthTransfer] TX confirmed by backend ✓');
        }
        console.log('[StealthTransfer] Explorer: https://explorer.solana.com/tx/' + txSig + '?cluster=devnet');

        setTxSignature(txSig!);
        return { txSignature: txSig!, stealthAddress: stealthAddress!, ephemeralR: ephemeralR!, viewTag: viewTag! };
      } catch (err) {
        const e = err as any;
        console.error('[StealthTransfer] ERROR:', e?.message, e);
        setError(e?.message || 'Transfer failed');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, isWalletAuth, userData, signAndSendTransaction, wallets, setMWAInProgress],
  );

  const reset = useCallback(() => {
    setError(null);
    setTxSignature(null);
  }, []);

  return { isLoading, error, txSignature, send, reset };
}
