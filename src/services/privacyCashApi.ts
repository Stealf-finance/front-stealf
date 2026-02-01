import type {
  InitiateDepositRequest,
  InitiateWithdrawRequest,
  InitiateTransferResponse,
  GetTransferResponse,
  TransferHistoryResponse,
} from '../types/privacyCash';

/**
 * Initiate private deposit
 */
export async function initiatePrivateDesposit(
  request: InitiateDepositRequest,
  sessionToken: string
): Promise<InitiateTransferResponse> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/private-transfer/initiatedeposit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to initiate transfer: ${response.statusText}`);
  }

  return response.json();
}

export async function initiatePrivateWithdraw(
  request: InitiateWithdrawRequest,
  sessionToken: string
): Promise<InitiateTransferResponse> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/private-transfer/initiatewithdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to initiate transfer: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupérer le statut d'un transfert
 */
export async function getTransferStatus(
  transferId: string,
  sessionToken: string
): Promise<GetTransferResponse> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/private-transfer/${transferId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to get transfer status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupérer l'historique des transferts
 */
export async function getTransferHistory(
  sessionToken: string,
  limit: number = 10
): Promise<TransferHistoryResponse> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/private-transfer/user/history?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to get transfer history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Retry un transfert échoué
 */
export async function retryTransfer(
  transferId: string,
  sessionToken: string
): Promise<GetTransferResponse> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/private-transfer/${transferId}/retry`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to retry transfer: ${response.statusText}`);
  }

  return response.json();
}