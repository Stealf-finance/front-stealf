/**
 * Privacy Transfer API Client
 * Handles private transfers via Privacy Pool (breaks on-chain link between sender/receiver)
 *
 * Note: Arcium MPC is currently unavailable (MxeKeysNotSet), using Privacy Pool instead
 */

import { UMBRA_CONFIG } from '../config/umbra';

// Types
export interface ArciumEncryptedTransferRequest {
  fromPrivateKey: string;  // Base58 encoded
  toAddress: string;
  amount: number;  // In SOL
  userId?: string;
}

// Privacy Pool Response (replaces Arcium MPC response)
export interface PrivacyPoolTransferResponse {
  success: boolean;
  privacy: {
    method: string;
    linkBroken: boolean;
    description: string;
  };
  transactions: {
    deposit: {
      signature: string;
      explorer: string;
      visible: string;
    };
    withdraw: {
      signature: string;
      explorer: string;
      visible: string;
    };
  };
  pool: string;
  amount: {
    sol: number;
    lamports: string;
  };
}

// Legacy Arcium response type (kept for compatibility)
export interface ArciumEncryptedTransferResponse {
  success: boolean;
  message: string;
  transfer: {
    computationSignature: string;
    finalizationSignature: string;
    sender: string;
    recipient: string;
    computationOffset: string;
  };
  encryption: {
    encryptedAmount: string;  // Hex encoded
    nonce: string;  // Hex encoded
    publicKey: string;  // Hex encoded
  };
  privacy: {
    amountVisible: boolean;
    amountEncrypted: boolean;
    onlyRecipientCanDecrypt: boolean;
  };
  note?: string;
}

export interface ArciumDecryptRequest {
  encryptedAmount: string;  // Hex encoded
  nonce: string;  // Hex encoded
  senderPublicKey: string;  // Hex encoded
  recipientPrivateKey: string;  // Hex encoded
}

export interface ArciumDecryptResponse {
  success: boolean;
  decrypted: {
    amountLamports: string;
    amountSOL: number;
  };
}

export interface ArciumKeypairResponse {
  success: boolean;
  keypair: {
    privateKey: string;  // Hex encoded
    publicKey: string;  // Hex encoded
  };
  warning?: string;
}

export interface ArciumTransferInfo {
  id: string;
  sender: string;
  recipient: string;
  status: string;
  timestamp: string;
  computationOffset: string;
  encrypted: boolean;
}

export interface ArciumUserTransfersResponse {
  success: boolean;
  count: number;
  transfers: ArciumTransferInfo[];
}

export interface ArciumReceivedTransfer {
  id: string;
  sender: string;
  status: string;
  timestamp: string;
  encryption: {
    encryptedAmount: string;
    nonce: string;
    senderPublicKey: string;
  };
  note: string;
}

export interface ArciumReceivedTransfersResponse {
  success: boolean;
  count: number;
  transfers: ArciumReceivedTransfer[];
}

export interface ArciumStatsResponse {
  success: boolean;
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalVolumeEncrypted: boolean;
  privacy: {
    amountsEncrypted: boolean;
    totalVolumeHidden: boolean;
    onlyParticipantsKnowAmounts: boolean;
  };
}

export interface ArciumApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
}

/**
 * Base fetch wrapper for Arcium API
 */
async function fetchArcium<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | ArciumApiError> {
  try {
    const url = `${UMBRA_CONFIG.API_URL}${endpoint}`;

    console.log(`[ArciumAPI] ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ArciumAPI] Error:', data);
      return {
        success: false,
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        error: data.error,
        code: data.code,
      } as ArciumApiError;
    }

    console.log('[ArciumAPI] Success:', data);
    return data as T;
  } catch (error: any) {
    console.error('[ArciumAPI] Network error:', error);
    return {
      success: false,
      message: error.message || 'Network error occurred',
      error: error.toString(),
    } as ArciumApiError;
  }
}

/**
 * Create a private transfer via Privacy Pool
 * This breaks the on-chain link between sender and recipient
 *
 * Flow:
 * 1. Sender deposits to Privacy Pool (visible: Sender → Pool)
 * 2. Pool withdraws to Recipient (visible: Pool → Recipient)
 * Result: No direct on-chain link between Sender and Recipient!
 */
export async function encryptedTransfer(
  request: ArciumEncryptedTransferRequest
): Promise<PrivacyPoolTransferResponse | ArciumApiError> {
  return fetchArcium<PrivacyPoolTransferResponse>('/api/arcium/pool/transfer', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Decrypt a received encrypted transfer amount
 */
export async function decryptTransfer(
  request: ArciumDecryptRequest
): Promise<ArciumDecryptResponse | ArciumApiError> {
  return fetchArcium<ArciumDecryptResponse>('/api/arcium/transfer/decrypt', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Generate a new x25519 keypair for encryption
 */
export async function generateKeypair(): Promise<ArciumKeypairResponse | ArciumApiError> {
  return fetchArcium<ArciumKeypairResponse>('/api/arcium/keypair/generate', {
    method: 'POST',
  });
}

/**
 * Get all encrypted transfers for a user
 */
export async function getUserTransfers(
  userId: string
): Promise<ArciumUserTransfersResponse | ArciumApiError> {
  return fetchArcium<ArciumUserTransfersResponse>(`/api/arcium/transfers/${userId}`, {
    method: 'GET',
  });
}

/**
 * Get all encrypted transfers received by an address
 */
export async function getReceivedTransfers(
  address: string
): Promise<ArciumReceivedTransfersResponse | ArciumApiError> {
  return fetchArcium<ArciumReceivedTransfersResponse>(`/api/arcium/received/${address}`, {
    method: 'GET',
  });
}

/**
 * Get encrypted transfers statistics
 */
export async function getStats(): Promise<ArciumStatsResponse | ArciumApiError> {
  return fetchArcium<ArciumStatsResponse>('/api/arcium/stats', {
    method: 'GET',
  });
}

/**
 * Utility: Check if response is an error
 */
export function isArciumError(response: any): response is ArciumApiError {
  return response && response.success === false;
}

/**
 * Default export with all methods
 */
export const arciumApi = {
  encryptedTransfer,
  decryptTransfer,
  generateKeypair,
  getUserTransfers,
  getReceivedTransfers,
  getStats,
  isArciumError,
};

export default arciumApi;
