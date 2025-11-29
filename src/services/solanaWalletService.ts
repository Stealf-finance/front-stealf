import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { SOLANA_CONFIG, UMBRA_CONFIG } from '../config/umbra';

/**
 * Service pour gérer un wallet Solana classique
 * Les wallets sont stockés sur le serveur (MongoDB) et cachés localement
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
   * Get the SecureStore key for the current user (local cache)
   * IMPORTANT: Returns null if no email is set to prevent using wrong key
   */
  private getSecureStoreKey(): string | null {
    if (!this.currentUserEmail) {
      console.warn('⚠️ SolanaWalletService: No user email set, cannot get secure key');
      return null;
    }
    const safeEmail = this.currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_');
    return `solanaWallet_${safeEmail}`;
  }

  /**
   * Chiffre la clé secrète (simple base64 pour beta)
   */
  private encryptSecretKey(secretKey: Uint8Array): string {
    const secretKeyArray = Array.from(secretKey);
    return Buffer.from(JSON.stringify(secretKeyArray)).toString('base64');
  }

  /**
   * Déchiffre la clé secrète
   */
  private decryptSecretKey(encrypted: string): Uint8Array {
    const secretKeyArray = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
    return new Uint8Array(secretKeyArray);
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
   * Sauvegarde le wallet sur le serveur
   */
  private async saveWalletToServer(wallet: Keypair, email: string): Promise<void> {
    try {
      const encryptedKey = this.encryptSecretKey(wallet.secretKey);

      const response = await fetch(`${UMBRA_CONFIG.API_URL}/api/users/public-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          solanaWallet: wallet.publicKey.toBase58(),
          encryptedPrivateKey: encryptedKey,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.warn('⚠️ Failed to save public wallet to server:', data.message);
      } else {
        console.log('☁️ Public wallet saved to server');
      }
    } catch (error) {
      console.error('❌ Error saving public wallet to server:', error);
    }
  }

  /**
   * Récupère le wallet depuis le serveur
   */
  private async getWalletFromServer(email: string): Promise<Uint8Array | null> {
    try {
      const response = await fetch(
        `${UMBRA_CONFIG.API_URL}/api/users/public-wallet?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success && data.hasPublicWallet && data.encryptedPrivateKey) {
        console.log('☁️ Public wallet retrieved from server');
        const secretKey = this.decryptSecretKey(data.encryptedPrivateKey);

        // Cache locally
        await this.saveSecretKeyLocally(secretKey);

        return secretKey;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching public wallet from server:', error);
      return null;
    }
  }

  /**
   * Sauvegarde la clé secrète localement (cache)
   */
  private async saveSecretKeyLocally(secretKey: Uint8Array): Promise<void> {
    try {
      const key = this.getSecureStoreKey();
      if (!key) {
        console.warn('⚠️ Cannot save wallet locally: no user email set');
        return;
      }

      const secretKeyArray = Array.from(secretKey);
      await SecureStore.setItemAsync(key, JSON.stringify(secretKeyArray));
      console.log(`🔒 Public wallet cached locally for ${this.currentUserEmail}`);
    } catch (error) {
      console.error('❌ Error caching wallet locally:', error);
    }
  }

  /**
   * Crée un nouveau wallet Solana
   * Appelé lors du SIGNUP - sauvegarde sur serveur
   */
  async createWallet(): Promise<{
    publicKey: string;
    secretKey: Uint8Array;
  }> {
    try {
      console.log('🔑 Creating new Solana wallet...');

      const email = this.currentUserEmail;
      if (!email) {
        throw new Error('No user email set - cannot create wallet');
      }

      const newKeypair = Keypair.generate();

      console.log('✅ Wallet created successfully!');
      console.log(`   Public Key: ${newKeypair.publicKey.toBase58()}`);

      // Save to server
      await this.saveWalletToServer(newKeypair, email);

      // Cache locally
      await this.saveSecretKeyLocally(newKeypair.secretKey);

      this.keypair = newKeypair;

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
   * Charge le wallet (local cache puis serveur)
   * Appelé lors du LOGIN
   */
  async loadWallet(updateAddressCallback?: (address: string) => Promise<void>): Promise<Keypair | null> {
    try {
      const email = this.currentUserEmail;
      if (!email) {
        console.log('⚠️ No user email set - cannot load wallet');
        return null;
      }

      // 1. Try local cache first
      const key = this.getSecureStoreKey();
      if (key) {
        const secretKeyJson = await SecureStore.getItemAsync(key);

        if (secretKeyJson) {
          console.log(`✅ Found public wallet in local cache for ${email}`);
          const secretKeyArray = JSON.parse(secretKeyJson);
          const secretKey = new Uint8Array(secretKeyArray);
          this.keypair = Keypair.fromSecretKey(secretKey);
          console.log(`   Public Key: ${this.keypair.publicKey.toBase58()}`);
          return this.keypair;
        }
      }

      // 2. Fetch from server
      console.log(`🔍 Fetching public wallet from server for ${email}...`);
      const serverKey = await this.getWalletFromServer(email);

      if (serverKey) {
        this.keypair = Keypair.fromSecretKey(serverKey);
        console.log(`✅ Public wallet loaded from server: ${this.keypair.publicKey.toBase58()}`);

        if (updateAddressCallback) {
          await updateAddressCallback(this.keypair.publicKey.toBase58());
        }

        return this.keypair;
      }

      console.log(`ℹ️ No public wallet found for ${email}`);
      return null;
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
   * Signe une transaction
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
   * Récupère la clé secrète (depuis cache local ou serveur)
   */
  async getSecretKey(): Promise<Uint8Array | null> {
    try {
      const email = this.currentUserEmail;
      if (!email) {
        console.warn('⚠️ getSecretKey: No user email set');
        return null;
      }

      // Try local cache
      const key = this.getSecureStoreKey();
      if (key) {
        const secretKeyJson = await SecureStore.getItemAsync(key);

        if (secretKeyJson) {
          const secretKeyArray = JSON.parse(secretKeyJson);
          return new Uint8Array(secretKeyArray);
        }
      }

      // Try server
      return await this.getWalletFromServer(email);
    } catch (error) {
      console.error('❌ Error retrieving secret key:', error);
      return null;
    }
  }

  /**
   * Supprime le cache local du wallet
   */
  async clearWallet(): Promise<void> {
    try {
      const key = this.getSecureStoreKey();
      if (key) {
        await SecureStore.deleteItemAsync(key);
        console.log('🗑️ Wallet local cache cleared');
      }
      this.keypair = null;
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
