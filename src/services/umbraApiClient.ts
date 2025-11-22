/**
 * Umbra Privacy API Client
 * Handles all communication with the Umbra backend
 */

import { UMBRA_CONFIG } from '../config/umbra';
import type {
  DepositPublicRequest,
  DepositConfidentialRequest,
  ClaimRequest,
  DepositResponse,
  ClaimResponse,
  BalanceResponse,
  TransactionsResponse,
  UmbraApiError,
  DepositInfo,
  MixerTransferRequest,
  MixerTransferResponse,
  MixerDepositRequest,
  MixerDepositResponse,
  MixerWithdrawRequest,
  MixerWithdrawResponse,
  MixerStatusRequest,
  MixerStatusResponse,
  MixerStatsResponse,
} from '../types/umbra';

/**
 * Base fetch wrapper with error handling
 */
async function fetchUmbra<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | UmbraApiError> {
  try {
    const url = `${UMBRA_CONFIG.API_URL}${endpoint}`;

    console.log(`[UmbraAPI] ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[UmbraAPI] Error:', data);
      return {
        success: false,
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        error: data.error,
        code: data.code,
      } as UmbraApiError;
    }

    console.log('[UmbraAPI] Success:', data);
    return data as T;
  } catch (error: any) {
    console.error('[UmbraAPI] Network error:', error);
    return {
      success: false,
      message: error.message || 'Network error occurred',
      error: error.toString(),
    } as UmbraApiError;
  }
}

// ============================================
// Simple Mixer API (Privacy without ZK)
// ============================================

/**
 * One-step private transfer: Public Wallet → Pool → Private Wallet
 * This is the main function for simple privacy transfers
 */
export async function mixerTransfer(
  request: MixerTransferRequest
): Promise<MixerTransferResponse | UmbraApiError> {
  return fetchUmbra<MixerTransferResponse>(UMBRA_CONFIG.ENDPOINTS.MIXER_TRANSFER, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Deposit SOL into the mixer pool
 * Returns a claim secret that can be used later to withdraw
 */
export async function mixerDeposit(
  request: MixerDepositRequest
): Promise<MixerDepositResponse | UmbraApiError> {
  return fetchUmbra<MixerDepositResponse>(UMBRA_CONFIG.ENDPOINTS.MIXER_DEPOSIT, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Withdraw SOL from the mixer pool using claim secret
 */
export async function mixerWithdraw(
  request: MixerWithdrawRequest
): Promise<MixerWithdrawResponse | UmbraApiError> {
  return fetchUmbra<MixerWithdrawResponse>(UMBRA_CONFIG.ENDPOINTS.MIXER_WITHDRAW, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Check the status of a deposit by claim secret
 */
export async function mixerStatus(
  request: MixerStatusRequest
): Promise<MixerStatusResponse | UmbraApiError> {
  return fetchUmbra<MixerStatusResponse>(UMBRA_CONFIG.ENDPOINTS.MIXER_STATUS, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get mixer pool statistics
 */
export async function mixerStats(): Promise<MixerStatsResponse | UmbraApiError> {
  return fetchUmbra<MixerStatsResponse>(UMBRA_CONFIG.ENDPOINTS.MIXER_STATS, {
    method: 'GET',
  });
}

// ============================================
// Umbra Privacy API (ZK Privacy - Currently Unavailable)
// ============================================

/**
 * Simple private transfer from Grid wallet to Umbra wallet
 * This is a simplified version that doesn't require Arcium account initialization
 */
export async function simplePrivateTransfer(
  request: DepositPublicRequest
): Promise<DepositResponse | UmbraApiError> {
  return fetchUmbra<DepositResponse>('/transfer/simple-private', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Create a public deposit (amount visible on-chain)
 * Provides anonymity but not confidentiality
 */
export async function depositPublic(
  request: DepositPublicRequest
): Promise<DepositResponse | UmbraApiError> {
  return fetchUmbra<DepositResponse>(UMBRA_CONFIG.ENDPOINTS.DEPOSIT_PUBLIC, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Create a confidential deposit (amount hidden on-chain)
 * Provides both anonymity and confidentiality
 */
export async function depositConfidential(
  request: DepositConfidentialRequest
): Promise<DepositResponse | UmbraApiError> {
  return fetchUmbra<DepositResponse>(UMBRA_CONFIG.ENDPOINTS.DEPOSIT_CONFIDENTIAL, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Claim a deposit using zero-knowledge proof
 */
export async function claimDeposit(
  request: ClaimRequest
): Promise<ClaimResponse | UmbraApiError> {
  return fetchUmbra<ClaimResponse>(UMBRA_CONFIG.ENDPOINTS.CLAIM, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get user's claimable balance
 */
export async function getBalance(userId: string): Promise<BalanceResponse | UmbraApiError> {
  return fetchUmbra<BalanceResponse>(
    `${UMBRA_CONFIG.ENDPOINTS.BALANCE}?userId=${userId}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get user's claimable deposits (not yet claimed)
 */
export async function getClaimableDeposits(
  userId: string
): Promise<{ success: boolean; deposits: DepositInfo[] } | UmbraApiError> {
  return fetchUmbra<{ success: boolean; deposits: DepositInfo[] }>(
    `${UMBRA_CONFIG.ENDPOINTS.DEPOSITS_CLAIMABLE}?userId=${userId}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get user's claimed deposits (already withdrawn)
 */
export async function getClaimedDeposits(
  userId: string
): Promise<{ success: boolean; deposits: DepositInfo[] } | UmbraApiError> {
  return fetchUmbra<{ success: boolean; deposits: DepositInfo[] }>(
    `${UMBRA_CONFIG.ENDPOINTS.DEPOSITS_CLAIMED}?userId=${userId}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get user's transaction history
 */
export async function getTransactions(
  userId: string,
  limit?: number,
  offset?: number
): Promise<TransactionsResponse | UmbraApiError> {
  const params = new URLSearchParams({ userId });
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());

  return fetchUmbra<TransactionsResponse>(
    `${UMBRA_CONFIG.ENDPOINTS.TRANSACTIONS}?${params.toString()}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Utility: Convert lamports to SOL
 */
export function lamportsToSol(lamports: string | number): number {
  const lamportsNum = typeof lamports === 'string' ? parseInt(lamports, 10) : lamports;
  return lamportsNum / 1_000_000_000;
}

/**
 * Utility: Convert SOL to lamports
 */
export function solToLamports(sol: number): string {
  return Math.floor(sol * 1_000_000_000).toString();
}

/**
 * Utility: Format SOL amount for display
 */
export function formatSol(lamports: string | number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
}

/**
 * Utility: Check if response is an error
 */
export function isError(response: any): response is UmbraApiError {
  return response && response.success === false;
}

/**
 * Default export with all methods
 */
export const umbraApi = {
  // Simple Mixer (Privacy without ZK)
  mixerTransfer,
  mixerDeposit,
  mixerWithdraw,
  mixerStatus,
  mixerStats,
  // Umbra Privacy (ZK - Currently Unavailable)
  simplePrivateTransfer,
  depositPublic,
  depositConfidential,
  claimDeposit,
  getBalance,
  getClaimableDeposits,
  getClaimedDeposits,
  getTransactions,
  // Utilities
  lamportsToSol,
  solToLamports,
  formatSol,
  isError,
};

export default umbraApi;
