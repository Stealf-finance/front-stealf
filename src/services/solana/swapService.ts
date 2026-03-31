import { useAuthenticatedApi } from '../../hooks/api/useApi';
import { useCallback } from 'react';

export interface OrderRequest {
  inputMint: string;
  amount: string;
  taker: string;
  receiver?: string;
}

export interface OrderResponse {
  requestId: string;
  transaction: string;
  totalInputAmount: string;
  totalOutputAmount: string;
  expiresAt: string;
  swapType: string;
  slippageBps: number;
}

export interface ExecuteRequest {
  requestId: string;
  signedTransaction: string;
}

export interface ExecuteResponse {
  status: string;
  signature: string;
  slot: number;
  code: number;
  inputAmountResult: string;
  outputAmountResult: string;
}

export function useSwapApi() {
  const { post } = useAuthenticatedApi();

  const order = useCallback(async (request: OrderRequest): Promise<OrderResponse> => {
    return post('/api/swap/order', request);
  }, [post]);

  const execute = useCallback(async (request: ExecuteRequest): Promise<ExecuteResponse> => {
    return post('/api/swap/execute', request);
  }, [post]);

  return { order, execute };
}
