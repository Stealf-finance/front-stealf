/**
 * Rhino.fi Bridge Configuration
 * Cross-chain bridge settings and display configs
 */

import type { SupportedSourceChain, RhinoBridgeState } from '../types/rhino';

// Chain explorer URLs for transaction links
export const CHAIN_EXPLORERS: Record<string, string> = {
  ETHEREUM: 'https://etherscan.io',
  ARBITRUM_ONE: 'https://arbiscan.io',
  BASE: 'https://basescan.org',
  POLYGON: 'https://polygonscan.com',
  OPTIMISM: 'https://optimistic.etherscan.io',
  SOLANA: 'https://explorer.solana.com',
};

// Get transaction URL for a chain
export function getTransactionUrl(chain: string, txHash: string): string {
  const explorer = CHAIN_EXPLORERS[chain];
  if (!explorer) return '';

  if (chain === 'SOLANA') {
    return `${explorer}/tx/${txHash}?cluster=devnet`;
  }
  return `${explorer}/tx/${txHash}`;
}

// Bridge status display config
export const BRIDGE_STATUS_CONFIG: Record<RhinoBridgeState, {
  label: string;
  color: string;
  description: string;
}> = {
  PENDING: {
    label: 'Waiting for Deposit',
    color: '#FFA500',
    description: 'Send funds to the deposit address',
  },
  PENDING_CONFIRMATION: {
    label: 'Confirming',
    color: '#3498db',
    description: 'Deposit detected, waiting for confirmations',
  },
  ACCEPTED: {
    label: 'Processing',
    color: '#9b59b6',
    description: 'Bridge in progress, sending to Solana',
  },
  EXECUTED: {
    label: 'Completed',
    color: '#2ecc71',
    description: 'Funds received on Solana',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#95a5a6',
    description: 'Bridge was cancelled',
  },
  FAILED: {
    label: 'Failed',
    color: '#e74c3c',
    description: 'Bridge failed, contact support for refund',
  },
};

// Estimated times by chain
export const ESTIMATED_BRIDGE_TIMES: Record<SupportedSourceChain, string> = {
  ETHEREUM: '~15 min',
  ARBITRUM_ONE: '~5 min',
  BASE: '~5 min',
  POLYGON: '~10 min',
  OPTIMISM: '~5 min',
};

// Minimum amounts by token (USD equivalent)
export const MIN_BRIDGE_AMOUNTS: Record<string, number> = {
  USDC: 10,
  USDT: 10,
  ETH: 0.005,
};
