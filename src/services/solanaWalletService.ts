import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { SOLANA_CONFIG } from '../config/umbra';

/**
 * Service pour gérer un wallet Solana classique
 * Remplace Grid SDK pour avoir accès direct à la clé privée
 */
class SolanaWalletService {
  private connection: Connection;
  private keypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_CONFIG.RPC_URL, 'confirmed');
  }

  /**
   * Crée un nouveau wallet Solana
   * Appelé lors du SIGNUP
   */
  async createWallet(): Promise<{
    publicKey: string;
    secretKey: Uint8Array;
  }> {
    try {
      console.log('🔑 Creating new Solana wallet...');

      const newKeypair = Keypair.generate();

      // Sauvegarder la clé privée de manière sécurisée
      await this.saveSecretKey(newKeypair.secretKey);

      this.keypair = newKeypair;

      console.log('✅ Wallet created successfully!');
      console.log(`   Public Key: ${newKeypair.publicKey.toBase58()}`);

      return {
        publicKey: newKeypair.publicKey.toBase58(),
        secretKey: newKeypair.secretKey,
      };
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Importe un wallet existant depuis une clé privée
   * Optionnel pour permettre aux utilisateurs d'importer leur wallet
   */
  async importWallet(secretKey: Uint8Array): Promise<string> {
    try {
      console.log('📥 Importing wallet...');

      const importedKeypair = Keypair.fromSecretKey(secretKey);

      // Sauvegarder la clé privée
      await this.saveSecretKey(secretKey);

      this.keypair = importedKeypair;

      console.log('✅ Wallet imported successfully!');
      console.log(`   Public Key: ${importedKeypair.publicKey.toBase58()}`);

      return importedKeypair.publicKey.toBase58();
    } catch (error) {
      console.error('❌ Error importing wallet:', error);
      throw error;
    }
  }

  /**
   * Charge le wallet depuis le stockage sécurisé
   * Appelé lors du LOGIN
   */
  async loadWallet(): Promise<Keypair | null> {
    try {
      const secretKey = await this.getSecretKey();

      if (!secretKey) {
        console.log('ℹ️ No wallet found in storage');
        return null;
      }

      this.keypair = Keypair.fromSecretKey(secretKey);
      console.log('✅ Wallet loaded successfully!');
      console.log(`   Public Key: ${this.keypair.publicKey.toBase58()}`);

      return this.keypair;
    } catch (error) {
      console.error('❌ Error loading wallet:', error);
      return null;
    }
  }

  /**
   * Récupère le Keypair actuel
   */
  getKeypair(): Keypair | null {
    return this.keypair;
  }

  /**
   * Récupère l'adresse publique
   */
  getPublicKey(): string | null {
    return this.keypair ? this.keypair.publicKey.toBase58() : null;
  }

  /**
   * Récupère le solde du wallet
   */
  async getBalance(): Promise<number> {
    try {
      if (!this.keypair) {
        throw new Error('Wallet not loaded');
      }

      const balance = await this.connection.getBalance(this.keypair.publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;

      console.log(`💰 Wallet balance: ${balanceInSOL} SOL`);

      return balanceInSOL;
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Envoie des SOL à une adresse
   */
  async sendSOL(toAddress: string, amountSOL: number): Promise<string> {
    try {
      if (!this.keypair) {
        throw new Error('Wallet not loaded');
      }

      console.log(`💸 Sending ${amountSOL} SOL to ${toAddress}...`);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: new PublicKey(toAddress),
          lamports: amountSOL * LAMPORTS_PER_SOL,
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);

      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Transaction sent successfully!');
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error) {
      console.error('❌ Error sending SOL:', error);
      throw error;
    }
  }

  /**
   * Signe une transaction (pour compatibilité avec d'autres services)
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this.keypair) {
        throw new Error('Wallet not loaded');
      }

      transaction.sign(this.keypair);
      return transaction;
    } catch (error) {
      console.error('❌ Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la clé privée de manière sécurisée
   */
  private async saveSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      const secretKeyArray = Array.from(secretKey);

      await SecureStore.setItemAsync(
        'solanaWalletSecretKey',
        JSON.stringify(secretKeyArray)
      );

      console.log('🔒 Wallet secret key saved securely');
    } catch (error) {
      console.error('❌ Error saving secret key:', error);
      throw error;
    }
  }

  /**
   * Récupère la clé privée depuis le stockage sécurisé
   */
  async getSecretKey(): Promise<Uint8Array | null> {
    try {
      const secretKeyJson = await SecureStore.getItemAsync('solanaWalletSecretKey');

      if (!secretKeyJson) {
        return null;
      }

      const secretKeyArray = JSON.parse(secretKeyJson);
      return new Uint8Array(secretKeyArray);
    } catch (error) {
      console.error('❌ Error retrieving secret key:', error);
      return null;
    }
  }

  /**
   * Supprime les données du wallet lors de la déconnexion
   */
  async clearWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('solanaWalletSecretKey');
      this.keypair = null;
      console.log('🗑️ Wallet data cleared');
    } catch (error) {
      console.error('❌ Error clearing wallet data:', error);
    }
  }

  /**
   * Vérifie si un wallet existe
   */
  async hasWallet(): Promise<boolean> {
    const secretKey = await this.getSecretKey();
    return secretKey !== null;
  }

  /**
   * Demande de l'airdrop (devnet uniquement)
   */
  async requestAirdrop(amountSOL: number = 1): Promise<string> {
    try {
      if (!this.keypair) {
        throw new Error('Wallet not loaded');
      }

      if (SOLANA_CONFIG.NETWORK !== 'devnet') {
        throw new Error('Airdrop only available on devnet');
      }

      console.log(`🪂 Requesting ${amountSOL} SOL airdrop...`);

      const signature = await this.connection.requestAirdrop(
        this.keypair.publicKey,
        amountSOL * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Airdrop received!');
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error) {
      console.error('❌ Error requesting airdrop:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new SolanaWalletService();
