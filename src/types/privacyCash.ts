export type PrivateTransferStatus =
  | 'pending_vault'
  | 'vault_received'
  | 'deposited'
  | 'withdrawn'
  | 'completed'
  | 'failed';

export interface PrivateTransferFees {
  vaultDeposit: number;
  privacyDeposit: number;
  privacyWithdraw: number;
  total: number;
}

export interface PrivateTransferTransactions {
  vaultDepositTx?: string;
  privacyCashDepositTx?: string;
  privacyCashWithdrawTx?: string;
}

export interface PrivateTransfer {
  transferId: string;
  status: PrivateTransferStatus;
  vaultAddress: string;
  destinationWallet: string;
  amount: number;
  tokenMint?: string;
  fees: PrivateTransferFees;
  transactions?: PrivateTransferTransactions;
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string;
}

export interface InitiateDepositRequest {
  fromAddress: string;
  amount: number;
  tokenMint?: string;
}

export interface InitiateWithdrawRequest {
  walletID: string;
  destinationWallet: string;
  amount: number;
  tokenMint?: string;
}

export interface InitiateTransferResponse {
  success: boolean;
  data: {
    transfer?: PrivateTransfer;
    deposit?: any; 
    withdraw?: any;
    instructions?: {
      message: string;
      vaultAddress: string;
      amount: number;
      transferId?: string;
      depositId?: string;
      tokenMint?: string;
      reference?: string;
      memo?: string;
    };
  };
}

export interface GetTransferResponse {
  success: boolean;
  data: {
    transfer: PrivateTransfer;
  };
}

export interface TransferHistoryResponse {
  success: boolean;
  data: {
    transfers: Array<{
      transferId: string;
      status: PrivateTransferStatus;
      amount: number;
      createdAt: string;
    }>;
    count: number;
  };
}

export interface WebSocketStatusUpdate {
  transferId: string;
  status: PrivateTransferStatus;
  amount: number;
  transactions?: PrivateTransferTransactions;
  timestamp: string;
}