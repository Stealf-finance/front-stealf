export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string;
  uiAmount?: number; // Deprecated, use amount instead
}

export interface Balance {
  sol: number;
  tokens: TokenBalance[];
}

export interface UserData {
  grid_user_id?: string;
  email?: string;
  username?: string;
  grid_address?: string;
  gridAddress?: string;
  policies?: any;
  authentication?: any;
}

export * from './navigation';
