import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Balance, TokenBalance } from '../types';
import { HELIUS_API_KEY } from '@env';

// Use Helius RPC if API key is configured, otherwise fallback to Devnet
const SOLANA_RPC_URL = HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.devnet.solana.com';

console.log('🔗 Solana RPC:', HELIUS_API_KEY ? 'Helius (enhanced)' : 'Devnet (standard)');
console.log('🔍 DEBUG - HELIUS_API_KEY:', HELIUS_API_KEY);
console.log('🔍 DEBUG - Full RPC URL:', SOLANA_RPC_URL);

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl: string = SOLANA_RPC_URL) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getBalance(address: string): Promise<Balance> {
    try {
      const pubkey = new PublicKey(address);
      const lamports = await this.connection.getBalance(pubkey);
      const sol = lamports / LAMPORTS_PER_SOL;

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens: TokenBalance[] = tokenAccounts.value.map((accountInfo) => {
        const parsedInfo = accountInfo.account.data.parsed.info;
        return {
          symbol: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.amount,
          decimals: parsedInfo.tokenAmount.decimals,
          uiAmount: parsedInfo.tokenAmount.uiAmount || 0,
          mint: parsedInfo.mint,
        };
      });

      return {
        sol,
        lamports,
        tokens,
      };
    } catch (error) {
      console.error('Error fetching Solana balance:', error);
      throw error;
    }
  }

  async getConnection(): Promise<Connection> {
    return this.connection;
  }
}

export const solanaService = new SolanaService();
