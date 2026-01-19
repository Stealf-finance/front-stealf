/**
 * Rhino.fi Bridge Types
 * Cross-chain bridges from Ethereum/L2s to Solana
 */

export interface RhinoChainConfig {
  supportedChains: string[];
  tokensByChain: Record<string, string[]>;
  destinationChain: string;
}

export interface RhinoDepositQuote {
  quoteId: string;
  depositAddress: string;
  chainIn: string;
  chainOut: string;
  tokenIn: string;
  tokenOut: string;
  payAmount: string;
  payAmountUsd: number;
  receiveAmount: string;
  receiveAmountUsd: number;
  fees: {
    fee: string;
    feeUsd: number;
  };
  expiresAt: string;
  estimatedDuration: number;
}

export interface RhinoBridgeStatus {
  quoteId: string;
  state: RhinoBridgeState;
  depositTxHash: string | null;
  withdrawTxHash: string | null;
}

export type RhinoBridgeState =
  | 'PENDING'
  | 'PENDING_CONFIRMATION'
  | 'ACCEPTED'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'FAILED';

export interface RhinoBridgeHistory {
  _id: string;
  quoteId: string;
  chainIn: string;
  chainOut: string;
  tokenIn: string;
  tokenOut: string;
  payAmount: string;
  payAmountUsd?: number;
  receiveAmount: string;
  receiveAmountUsd?: number;
  depositAddress: string;
  recipientAddress: string;
  status: string;
  depositTxHash?: string;
  withdrawTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportedSourceChain =
  | 'ETHEREUM'
  | 'ARBITRUM_ONE'
  | 'BASE'
  | 'POLYGON'
  | 'OPTIMISM';

export const CHAIN_DISPLAY_NAMES: Record<SupportedSourceChain, string> = {
  ETHEREUM: 'Ethereum',
  ARBITRUM_ONE: 'Arbitrum',
  BASE: 'Base',
  POLYGON: 'Polygon',
  OPTIMISM: 'Optimism',
};

export const CHAIN_COLORS: Record<SupportedSourceChain, string> = {
  ETHEREUM: '#627EEA',
  ARBITRUM_ONE: '#28A0F0',
  BASE: '#0052FF',
  POLYGON: '#8247E5',
  OPTIMISM: '#FF0420',
};
