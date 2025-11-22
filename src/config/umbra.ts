/**
 * Umbra Privacy Configuration
 * Backend API endpoints and blockchain constants
 */

// Backend API Configuration
export const UMBRA_CONFIG = {
  // Backend URL - update this for production
  API_URL: __DEV__
    ? 'http://192.168.1.44:3001'  // Development (local network)
    : 'https://api.stealf.app',    // Production

  // API Endpoints
  ENDPOINTS: {
    // Mixer Endpoints (Simple Privacy - No ZK)
    MIXER_TRANSFER: '/api/mixer/transfer',  // One-step: Public → Pool → Private
    MIXER_DEPOSIT: '/api/mixer/deposit',
    MIXER_WITHDRAW: '/api/mixer/withdraw',
    MIXER_STATUS: '/api/mixer/status',
    MIXER_STATS: '/api/mixer/stats',

    // Umbra Endpoints (ZK Privacy - Currently Unavailable)
    DEPOSIT_PUBLIC: '/api/umbra/deposit/public',
    DEPOSIT_CONFIDENTIAL: '/api/umbra/deposit/confidential',
    CLAIM: '/api/umbra/claim',
    DEPOSITS_CLAIMABLE: '/api/umbra/deposits/claimable',
    DEPOSITS_CLAIMED: '/api/umbra/deposits/claimed',
    TRANSACTIONS: '/api/umbra/transactions',
    BALANCE: '/api/umbra/balance',
  },
};

// Solana Token Mints
export const MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (mainnet)
  USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC (devnet)
};

// Blockchain Configuration
export const SOLANA_CONFIG = {
  NETWORK: 'devnet' as 'devnet' | 'mainnet-beta',
  RPC_URL: 'https://api.devnet.solana.com',
  EXPLORER_URL: 'https://explorer.solana.com',
  PROGRAM_ID: 'A5GtBtbNA3teSioCX2H3pqHncEqMPsnHxzzXYPFCzTA4',
};

// Constants
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Transaction Settings
export const TX_CONFIG = {
  CONFIRMATION_TIMEOUT: 60000, // 60 seconds
  RETRY_ATTEMPTS: 3,
  POLLING_INTERVAL: 2000, // 2 seconds
};

// Price Feeds (mock for devnet)
export const PRICE_FEEDS = {
  SOL_USD: 140, // Mock SOL price for devnet
};
