export enum WalletType {
  Solana = 'solana',
}

export interface SolanaWalletInterface {
  type: WalletType;
  getPublicKey(): Promise<string>;
  signMessage(message: string): Promise<string>;
}
