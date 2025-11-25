import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { SOLANA_CONFIG } from '../config/umbra';

/**
 * Service pour gérer un wallet Solana classique
 * Remplace Grid SDK pour avoir accès direct à la clé privée
 * IMPORTANT: Each user has their own wallet stored with email-specific keys
 */
class SolanaWalletService {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private currentUserEmail: string | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_CONFIG.RPC_URL, 'confirmed');
  }

  /**
   * Set current user email for user-specific wallet storage
   */
  setCurrentUserEmail(email: string): void {
    this.currentUserEmail = email;
    console.log('📧 SolanaWalletService: Current user email set to:', email);
  }

  /**
   * Get the SecureStore key for the current user
   */
  private getSecureStoreKey(): string {
    if (!this.currentUserEmail) {
      console.warn('⚠️ SolanaWalletService: No user email set, using global key');
      return 'solanaWalletSecretKey';
    }
    const safeEmail = this.currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_');
    return `solanaWallet_${safeEmail}`;
  }

  /**
   * Reset service state (call on logout)
   */
  reset(): void {
    this.keypair = null;
    this.currentUserEmail = null;
    console.log('🔄 SolanaWalletService: Reset');
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
   * Migrate wallet from old global key to new user-specific key
   * This is needed for users who created wallets before the user-specific storage update
   */
  async migrateFromGlobalKey(): Promise<boolean> {
    try {
      if (!this.currentUserEmail) {
        console.log('ℹ️ No user email set, cannot migrate');
        return false;
      }

      const userKey = this.getSecureStoreKey();
      const globalKey = 'solanaWalletSecretKey';

      // Check if user-specific key already exists
      const existingUserWallet = await SecureStore.getItemAsync(userKey);
      if (existingUserWallet) {
        console.log('✅ User already has a wallet at user-specific key');
        return true;
      }

      // Check if there's a wallet at the old global key
      const globalWallet = await SecureStore.getItemAsync(globalKey);
      if (!globalWallet) {
        console.log('ℹ️ No wallet found at global key to migrate');
        return false;
      }

      // Migrate: copy from global to user-specific key
      console.log('🔄 Migrating wallet from global key to user-specific key...');
      await SecureStore.setItemAsync(userKey, globalWallet);

      // Verify migration
      const verifyMigration = await SecureStore.getItemAsync(userKey);
      if (verifyMigration) {
        console.log('✅ Wallet migrated successfully to:', userKey);
        // Note: We don't delete the global key in case other users need it
        // It will be cleaned up naturally when those users log in and migrate
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error migrating wallet:', error);
      return false;
    }
  }

  /**
   * Charge le wallet depuis le stockage sécurisé
   * Appelé lors du LOGIN
   * @param updateAddressCallback - Optional callback to update the public address in storage
   */
  async loadWallet(updateAddressCallback?: (address: string) => Promise<void>): Promise<Keypair | null> {
    try {
      // First, try to migrate from global key if needed
      const didMigrate = await this.migrateFromGlobalKey();

      const secretKey = await this.getSecretKey();

      if (!secretKey) {
        console.log('ℹ️ No wallet found in storage');
        return null;
      }

      this.keypair = Keypair.fromSecretKey(secretKey);
      const publicKeyStr = this.keypair.publicKey.toBase58();
      console.log('✅ Wallet loaded successfully!');
      console.log(`   Public Key: ${publicKeyStr}`);

      // If we migrated and have a callback, update the public address in storage
      if (didMigrate && updateAddressCallback) {
        console.log('🔄 Updating public address in storage after migration...');
        await updateAddressCallback(publicKeyStr);
      }

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

      // Convert to lamports and ensure it's an integer
      const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: new PublicKey(toAddress),
          lamports,
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
   * Sauvegarde la clé privée de manière sécurisée (user-specific)
   */
  private async saveSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      const secretKeyArray = Array.from(secretKey);
      const key = this.getSecureStoreKey();

      await SecureStore.setItemAsync(
        key,
        JSON.stringify(secretKeyArray)
      );

      console.log('🔒 Wallet secret key saved securely for user:', this.currentUserEmail || 'global');
    } catch (error) {
      console.error('❌ Error saving secret key:', error);
      throw error;
    }
  }

  /**
   * Récupère la clé privée depuis le stockage sécurisé (user-specific)
   */
  async getSecretKey(): Promise<Uint8Array | null> {
    try {
      const key = this.getSecureStoreKey();
      const secretKeyJson = await SecureStore.getItemAsync(key);

      if (!secretKeyJson) {
        console.log('ℹ️ No wallet found for key:', key);
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
   * Supprime les données du wallet lors de la déconnexion (user-specific)
   */
  async clearWallet(): Promise<void> {
    try {
      const key = this.getSecureStoreKey();
      await SecureStore.deleteItemAsync(key);
      this.keypair = null;
      console.log('🗑️ Wallet data cleared for user:', this.currentUserEmail || 'global');
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
