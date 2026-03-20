/**
 * useUmbraMixer — Hook pour les transferts via Umbra Mixer.
 *
 * Flux Cash wallet  : POST /api/umbra/mixer/cash-deposit-submit (Turnkey server-side, req 5.3)
 * Flux Wealth wallet: POST /api/umbra/mixer/deposit (SDK signe+soumet côté backend, req 5.1)
 * Auto-registration : POST /api/umbra/mixer/register avant le premier dépôt (req 6.3)
 *
 * Note : le SDK @umbra-privacy/sdk v1.0.0 signe et soumet la TX automatiquement côté backend.
 * Le frontend envoie wealthKeypairSecret → backend signe via SDK → retourne txSignature directement.
 *
 * Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.5
 */

import { Keypair } from '@solana/web3.js';
import { useAuthenticatedApi } from '../services/clientStealf';

export interface UmbraDepositParams {
  fromWallet: 'cash' | 'wealth';
  toWallet: 'cash' | 'wealth';
  mint: string;
  amountLamports: number;
}

export interface UmbraDepositResult {
  txSignature: string;
}

export function useUmbraMixer() {
  const api = useAuthenticatedApi();

  /**
   * Dépôt depuis le Cash wallet (Turnkey server-side sign).
   * Le backend construit la TX ZK, la signe via Turnkey, et la soumet.
   * Retourne { fallback: true } si Umbra indisponible (req 6.5).
   */
  async function cashDeposit(params: UmbraDepositParams): Promise<UmbraDepositResult & { fallback?: boolean }> {
    return api.post('/api/umbra/mixer/cash-deposit-submit', params);
  }

  /**
   * Dépôt depuis le Wealth wallet.
   * Le SDK signe et soumet la TX automatiquement côté backend (via wealthKeypairSecret).
   * Appel unique → txSignature retourné directement.
   */
  async function wealthDeposit(
    params: UmbraDepositParams,
    wealthKeypair: Keypair,
  ): Promise<UmbraDepositResult> {
    return api.post('/api/umbra/mixer/deposit', {
      ...params,
      wealthKeypairSecret: Array.from(wealthKeypair.secretKey),
    });
  }

  /**
   * Auto-registration des wallets Cash et Wealth si besoin (req 6.3).
   * Retourne true si déjà enregistrés, false si la registration a été déclenchée.
   * Attend ~5s après déclenchement pour laisser la TX on-chain se confirmer.
   */
  async function ensureRegistered(
    cashWalletPublicKey: string,
    wealthWalletPublicKey: string,
    wealthKeypair: Keypair,
  ): Promise<boolean> {
    const wealthKeypairSecret = Array.from(wealthKeypair.secretKey);
    // Toujours dériver l'adresse wealth depuis le keypair local (pas stealf_wallet DB).
    // Pour les users MWA/Phantom, stealf_wallet = wallet Seeker (clé privée inaccessible).
    const actualWealthAddress = wealthKeypair.publicKey.toBase58();
    const result = await api.post('/api/umbra/mixer/register', {
      cashWalletPublicKey,
      wealthWalletPublicKey: actualWealthAddress,
      wealthKeypairSecret,
    });

    if (result.alreadyRegistered) {
      return true;
    }

    // 202 pending — attendre la confirmation on-chain (~5s sur devnet)
    await new Promise<void>(r => setTimeout(r, 5000));
    return false;
  }

  return { cashDeposit, wealthDeposit, ensureRegistered };
}
