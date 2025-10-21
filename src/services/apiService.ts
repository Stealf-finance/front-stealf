import { API_URL } from '../config/config';
import type { AuthResponse, TransactionRequest, TransactionResponse, APIError } from '../types';

export class APIService {
  private baseURL: string;

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, password: string, username: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async sendTransaction(
    request: TransactionRequest,
    authToken: string
  ): Promise<TransactionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/transactions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || 'Transaction failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}

export const apiService = new APIService();
