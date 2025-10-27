import type { Balance, TokenBalance } from '../types';
import { API_URL } from '../config/config';
import { authStorage } from './authStorage';

console.log('🔗 Using GRID SDK for balance and transactions');

export class SolanaService {
  constructor() {
    // All balance and transaction operations now use GRID SDK
  }

  async getBalance(address: string): Promise<Balance> {
    try {
      console.log('💰 Fetching balance for address:', address);

      // Use GRID SDK backend endpoint instead of direct RPC calls
      const token = await authStorage.getAccessToken();

      if (!token) {
        throw new Error('Authentication required to fetch balance');
      }

      console.log('🔑 Token obtained, calling /grid/balance...');

      const response = await fetch(`${API_URL}/grid/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          smartAccountAddress: address,
        }),
      });

      console.log('📥 Balance API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Balance API error:', errorData);
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch balance');
      }

      const responseData = await response.json();
      console.log('📊 Balance API response:', JSON.stringify(responseData, null, 2));

      // Extract data from response wrapper
      const data = responseData.data || responseData;

      // The backend already returns sol and lamports in the correct format
      const sol = parseFloat(data.sol || '0');
      const lamports = parseFloat(data.lamports || '0');

      console.log('💵 Parsed balance - SOL:', sol, 'Lamports:', lamports);

      const tokens: TokenBalance[] = (data.tokens || []).map((token: any) => ({
        symbol: token.symbol || token.name,
        amount: token.amount,
        decimals: token.decimals,
        uiAmount: parseFloat(token.amount_decimal || '0'),
        mint: token.token_address,
      }));

      return {
        sol,
        lamports,
        tokens,
      };
    } catch (error) {
      console.error('❌ Error fetching balance via GRID SDK:', error);
      throw error;
    }
  }
}

export const solanaService = new SolanaService();
