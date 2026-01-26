/**
 * Supported Tokens for SilentSwap
 * CAIP-19 identifiers for cross-chain asset identification
 */

import { TokenInfo } from '../types/swap';

// Solana Chain ID (Mainnet)
export const SOLANA_CHAIN_ID = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// CAIP-19 Formats
// Native: solana:<chainId>/slip44:501
// SPL Token: solana:<chainId>/spl:<mintAddress>

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/slip44:501`,
  },
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
  },
  {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/spl:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`,
  },
  {
    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/spl:mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So`,
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoUri: 'https://static.jup.ag/jup/icon.png',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/spl:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`,
  },
  {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoUri: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    caip19Id: `solana:${SOLANA_CHAIN_ID}/spl:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`,
  },
];

// Native SOL wrapped mint address
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// Get token by mint address
export function getTokenByMint(mint: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find((token) => token.mint === mint);
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// Build CAIP-10 contact ID for Solana address
export function buildSolanaContactId(address: string): string {
  return `caip10:solana:*:${address}`;
}

// Build CAIP-10 contact ID for EVM address
export function buildEvmContactId(chainId: number, address: string): string {
  return `caip10:eip155:${chainId}:${address}`;
}

// AsyncStorage key for swap history
export const SWAP_HISTORY_STORAGE_KEY = '@stealf/swap-history';

// Max history entries
export const MAX_HISTORY_ENTRIES = 100;

// Quote refresh interval (ms)
export const QUOTE_REFRESH_INTERVAL = 30000;

// Quote input debounce (ms)
export const QUOTE_DEBOUNCE_MS = 500;

// Swap timeout (ms)
export const SWAP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
