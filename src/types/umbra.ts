/**
 * Umbra Privacy Type Definitions
 * Types for API requests/responses and data structures
 */

// ============================================
// API Request Types
// ============================================

// Mixer Request Types (Simple Privacy - No ZK)
export interface MixerTransferRequest {
  publicWalletPrivateKey: string; // Base58-encoded private key of source wallet
  privateWalletAddress: string; // Destination wallet address
  amount: number; // Amount in SOL
}

export interface MixerDepositRequest {
  privateKey: string; // Base58-encoded private key
  amount: number; // Amount in SOL
}

export interface MixerWithdrawRequest {
  claimSecret: string; // Secret from deposit
  destinationAddress: string; // Destination wallet address
}

export interface MixerStatusRequest {
  claimSecret: string; // Secret from deposit
}

// Umbra Request Types (ZK Privacy - Currently Unavailable)
export interface DepositPublicRequest {
  userId: string;
  amount: string; // In lamports (bigint as string)
  mint: string; // Token mint address
  generationIndex?: string; // Optional generation index
}

export interface DepositConfidentialRequest {
  userId: string;
  amount: string; // In lamports (bigint as string)
  mint: string;
  generationIndex?: string;
}

export interface ClaimRequest {
  userId: string;
  depositArtifactsId: string;
  recipientAddress?: string; // Optional, defaults to user's wallet
}

// ============================================
// API Response Types
// ============================================

// Mixer Response Types (Simple Privacy - No ZK)
export interface MixerTransferResponse {
  success: boolean;
  depositTxSignature: string;
  withdrawalTxSignature: string;
  amountSOL: number;
  amountLamports: number;
  fromAddress: string;
  toAddress: string;
  poolAddress: string;
}

export interface MixerDepositResponse {
  success: boolean;
  claimSecret: string;
  depositTxSignature: string;
  poolAddress: string;
  estimatedWithdrawTime: string;
  amountSOL: number;
  amountLamports: number;
  warning: string;
}

export interface MixerWithdrawResponse {
  success: boolean;
  withdrawalTxSignature: string;
  amount: number;
  amountSOL: number;
}

export interface MixerStatusResponse {
  success: boolean;
  exists: boolean;
  claimed: boolean;
  amount?: number;
  amountSOL?: number;
  canWithdraw: boolean;
  remainingWaitTimeMs?: number;
  remainingWaitTimeMinutes?: number;
}

export interface MixerStatsResponse {
  success: boolean;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  totalVolumeSOL: number;
  activeDeposits: number;
  poolBalance: number;
  poolBalanceSOL: number;
}

// Umbra Response Types (ZK Privacy - Currently Unavailable)
export interface DepositResponse {
  success: boolean;
  generationIndex: string;
  claimableBalance: string; // In lamports
  signature: string; // Solana transaction signature
  transactionId: string; // MongoDB transaction ID
  depositArtifactsId: string; // MongoDB deposit artifacts ID
  message?: string;
}

export interface ClaimResponse {
  success: boolean;
  signature: string;
  claimedAmount: string; // In lamports
  recipientAddress: string;
  transactionId: string;
  message?: string;
}

export interface BalanceResponse {
  success: boolean;
  claimableBalance: string; // Total claimable in lamports
  totalDeposits: number;
  deposits: DepositInfo[];
}

export interface TransactionsResponse {
  success: boolean;
  transactions: TransactionInfo[];
  total: number;
}

// ============================================
// Data Structure Types
// ============================================

export interface DepositInfo {
  id: string;
  generationIndex: string;
  claimableBalance: string; // In lamports
  mint: string;
  depositType: 'public' | 'confidential';
  claimed: boolean;
  createdAt: string; // ISO date string
  claimedAt?: string;
  commitmentInsertionIndex?: number;
}

export interface TransactionInfo {
  id: string;
  type: 'deposit' | 'withdraw' | 'claim' | 'transfer';
  status: 'pending' | 'confirmed' | 'failed';
  amount: string; // In lamports
  mint: string;
  signature?: string;
  generationIndex?: string;
  nullifierHash?: string;
  createdAt: string;
  confirmedAt?: string;
  metadata?: {
    time?: number;
    mode?: string;
    optionalData?: string;
  };
}

// ============================================
// Error Types
// ============================================

export interface UmbraApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
}

// ============================================
// Frontend State Types
// ============================================

export interface PrivateBalance {
  claimable: number; // In SOL (converted from lamports)
  claimableUSD: number; // USD value
  totalDeposits: number;
  deposits: DepositInfo[];
  loading: boolean;
  error: string | null;
}

export interface TransactionState {
  isLoading: boolean;
  success: boolean;
  error: string | null;
  signature: string | null;
  depositArtifactsId: string | null;
}

// ============================================
// Type Guards
// ============================================

export function isUmbraApiError(response: any): response is UmbraApiError {
  return response && response.success === false && typeof response.message === 'string';
}

export function isDepositResponse(response: any): response is DepositResponse {
  return (
    response &&
    response.success === true &&
    typeof response.generationIndex === 'string' &&
    typeof response.signature === 'string'
  );
}

export function isBalanceResponse(response: any): response is BalanceResponse {
  return (
    response &&
    response.success === true &&
    typeof response.claimableBalance === 'string' &&
    Array.isArray(response.deposits)
  );
}
