/**
 * Rhino.fi Bridge API Client
 * Handles cross-chain bridges from Ethereum/L2s to Solana
 */

import { UMBRA_CONFIG } from '../config/umbra';
import type {
  RhinoChainConfig,
  RhinoDepositQuote,
  RhinoBridgeStatus,
  RhinoBridgeHistory,
} from '../types/rhino';

// Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base fetch wrapper for Rhino API
 */
async function fetchRhino<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${UMBRA_CONFIG.API_URL}${endpoint}`;

    console.log(`[RhinoAPI] ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[RhinoAPI] Error:', data);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    console.log('[RhinoAPI] Success');
    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('[RhinoAPI] Network error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred',
    };
  }
}

/**
 * Get supported chains and tokens for bridging
 */
export async function getConfigs(): Promise<ApiResponse<RhinoChainConfig>> {
  return fetchRhino<RhinoChainConfig>('/api/rhino/configs');
}

/**
 * Get a public quote (pricing only, no deposit address)
 */
export async function getPublicQuote(params: {
  chainIn: string;
  token: string;
  amount: string;
}): Promise<ApiResponse<any>> {
  return fetchRhino('/api/rhino/quote', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Generate a deposit address for bridging to Solana
 */
export async function getDepositAddress(params: {
  chainIn: string;
  token: string;
  amount: string;
  recipientAddress: string;
  userEmail?: string;
}): Promise<ApiResponse<RhinoDepositQuote>> {
  return fetchRhino<RhinoDepositQuote>('/api/rhino/deposit-address', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Check bridge status
 */
export async function getBridgeStatus(
  quoteId: string
): Promise<ApiResponse<RhinoBridgeStatus>> {
  return fetchRhino<RhinoBridgeStatus>(`/api/rhino/status/${quoteId}`);
}

/**
 * Get bridge details by quoteId
 */
export async function getBridgeDetails(
  quoteId: string
): Promise<ApiResponse<RhinoBridgeHistory>> {
  return fetchRhino<RhinoBridgeHistory>(`/api/rhino/bridge/${quoteId}`);
}

/**
 * Get user's bridge history
 */
export async function getBridgeHistory(
  userEmail: string,
  limit?: number
): Promise<ApiResponse<{ count: number; bridges: RhinoBridgeHistory[] }>> {
  const queryParams = new URLSearchParams({ userEmail });
  if (limit) queryParams.append('limit', limit.toString());

  return fetchRhino(`/api/rhino/history?${queryParams}`);
}

/**
 * Get user's pending bridges
 */
export async function getPendingBridges(
  userEmail: string
): Promise<ApiResponse<{ count: number; bridges: RhinoBridgeHistory[] }>> {
  return fetchRhino(`/api/rhino/pending?userEmail=${encodeURIComponent(userEmail)}`);
}

/**
 * Default export with all methods
 */
export const rhinoApi = {
  getConfigs,
  getPublicQuote,
  getDepositAddress,
  getBridgeStatus,
  getBridgeDetails,
  getBridgeHistory,
  getPendingBridges,
};

export default rhinoApi;
