/**
 * SilentSwap Private Wallet Types
 * Types for token swaps with privacy features via SilentSwap
 */

// Token Information
export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  caip19Id: string;
}

// Quote Types
export interface SwapQuote {
  estimatedOutput: string;
  estimatedOutputUsd: number;
  serviceFeeUsd: number;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  expiresAt: number;
  route: SwapRoute;
}

export interface SwapRoute {
  path: string[];
  bridgeProvider?: string;
  estimatedDuration: number;
}

export type SwapQuoteErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'UNSUPPORTED_PAIR'
  | 'AMOUNT_TOO_LOW'
  | 'NETWORK_ERROR';

export interface SwapQuoteError {
  code: SwapQuoteErrorCode;
  message: string;
}

// Swap Execution Types
export interface SwapExecuteParams {
  sourceToken: TokenInfo;
  destinationToken: TokenInfo;
  amount: string;
  quote: SwapQuote;
  privacyEnabled: boolean;
  destinationAddress: string;
}

export interface SwapResult {
  success: boolean;
  transactionId: string;
  outputAmount: string;
  explorerUrl: string;
}

export type SwapStep =
  | 'PREPARING'
  | 'SIGNING'
  | 'SUBMITTING'
  | 'BRIDGING'
  | 'COMPLETING';

export type SwapExecuteErrorCode =
  | 'USER_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'TRANSACTION_FAILED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export interface SwapExecuteError {
  code: SwapExecuteErrorCode;
  message: string;
  recoverable: boolean;
}

// History Types
export interface SwapHistoryEntry {
  id: string;
  timestamp: number;
  sourceToken: TokenInfo;
  destinationToken: TokenInfo;
  inputAmount: string;
  outputAmount: string;
  transactionId: string;
  privacyEnabled: boolean;
  status: 'completed' | 'failed';
}

// Hook Return Types
export interface UseSwapQuoteResult {
  quote: SwapQuote | null;
  isLoading: boolean;
  error: SwapQuoteError | null;
  refetch: () => Promise<void>;
}

export interface UseSwapResult {
  executeSwap: (params: SwapExecuteParams) => Promise<SwapResult>;
  isExecuting: boolean;
  currentStep: SwapStep | null;
  error: SwapExecuteError | null;
}

export interface UseSwapHistoryResult {
  history: SwapHistoryEntry[];
  isLoading: boolean;
  saveSwap: (entry: Omit<SwapHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearHistory: () => Promise<void>;
}

// EVM Wallet Types
export interface EvmTransaction {
  to: string;
  data: string;
  value?: string;
  gasLimit?: string;
}

export interface EphemeralEvmWallet {
  address: string;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (tx: EvmTransaction) => Promise<string>;
}

export interface UseEphemeralEvmWalletResult {
  getEvmWallet: () => Promise<EphemeralEvmWallet>;
  isLoading: boolean;
  error: string | null;
}

// Turnkey Adapter Types
export interface TurnkeyWalletAdapter {
  publicKey: string;
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>;
  signAndSendTransaction: (transaction: Uint8Array) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}
