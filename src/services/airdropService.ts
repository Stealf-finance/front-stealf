import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Mainnet RPC (your wallet has SOL on mainnet, not devnet)
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

export const airdropService = {
  /**
   * Note: Airdrop is NOT available on mainnet
   * This will always fail on mainnet - only for devnet
   */
  async requestAirdrop(address: string, amount: number = 1): Promise<string> {
    throw new Error('Airdrop is not available on mainnet. You need to buy SOL from an exchange.');
  },

  /**
   * Check if account needs airdrop
   */
  async needsAirdrop(address: string, minBalance: number = 0.1): Promise<boolean> {
    try {
      const connection = new Connection(MAINNET_RPC, 'confirmed');
      const publicKey = new PublicKey(address);

      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      console.log(`💰 Current balance: ${balanceSOL} SOL`);
      return balanceSOL < minBalance;
    } catch (error) {
      console.error('Failed to check balance:', error);
      return true; // Assume needs airdrop if check fails
    }
  }
};
