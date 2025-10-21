// API request and response types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  gridAddress: string;
  gridUserId: string;
}

export interface TransactionRequest {
  to: string;
  amount: number;
  currency: string;
}

export interface TransactionResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  signature?: string;
}

// API error type
export interface APIError {
  message: string;
  code?: string;
  details?: any;
}
