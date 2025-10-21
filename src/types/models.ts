// Balance and wallet related types
export interface TokenBalance {
  symbol: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  mint: string;
}

export interface Balance {
  sol: number;
  lamports: number;
  tokens: TokenBalance[];
}

// Transaction types
export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  currency: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  from?: string;
  to?: string;
}

// User data types
export interface UserData {
  email?: string;
  username?: string;
  gridAddress?: string;
  gridUserId?: string;
}
