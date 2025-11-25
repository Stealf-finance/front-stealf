import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from './authStorage';

/**
 * Service pour gérer le Private Wallet (wallet Solana séparé)
 *
 * Ce service permet de :
 * 1. Créer un Private Wallet (simple Keypair Solana)
 * 2. Stocker et récupérer la clé privée de manière sécurisée
 * 3. Gérer le Private Wallet indépendamment du wallet public
 *
 * IMPORTANT: Chaque utilisateur a son propre wallet privé, lié à son email
 */
class StealfService {
  // Cache de l'email courant pour éviter les appels répétés
  private currentUserEmail: string | null = null;

  /**
   * Définit l'email de l'utilisateur courant (appelé au login/register)
   */
  setCurrentUserEmail(email: string): void {
    this.currentUserEmail = email;
    console.log('📧 StealfService: Current user email set to', email);
  }

  /**
   * Récupère l'email de l'utilisateur courant
   */
  private async getCurrentUserEmail(): Promise<string | null> {
    if (this.currentUserEmail) {
      return this.currentUserEmail;
    }

    // Fallback: récupérer depuis authStorage
    const userData = await authStorage.getUserData();
    if (userData?.email) {
      this.currentUserEmail = userData.email;
      return userData.email;
    }

    return null;
  }

  /**
   * Génère la clé SecureStore pour un utilisateur spécifique
   */
  private getSecureStoreKey(email: string): string {
    // Créer une clé unique par utilisateur
    // On encode l'email pour éviter les caractères spéciaux
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    return `privateWallet_${safeEmail}`;
  }

  /**
   * Crée un nouveau Private Wallet (simple Keypair Solana)
   * Appelé lors du SIGNUP ou à la demande
   *
   * @returns Le Keypair du Private Wallet créé
   */
  async createPrivateWallet(): Promise<Keypair> {
    try {
      console.log('🔗 Creating Private Wallet...');

      const email = await this.getCurrentUserEmail();
      if (!email) {
        throw new Error('No user email found - cannot create private wallet');
      }

      // Créer un nouveau Keypair Solana
      const privateWallet = Keypair.generate();

      console.log('✅ Private Wallet created successfully!');
      console.log(`   Private Wallet: ${privateWallet.publicKey.toBase58()}`);
      console.log(`   For user: ${email}`);

      // Sauvegarder la clé privée de manière sécurisée (liée à l'utilisateur)
      await this.savePrivateWalletSecretKey(privateWallet.secretKey, email);

      return privateWallet;
    } catch (error) {
      console.error('❌ Error creating Private Wallet:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la clé secrète du Private Wallet de manière sécurisée
   *
   * @param secretKey - Clé secrète du Private Wallet (Uint8Array)
   * @param email - Email de l'utilisateur
   */
  private async savePrivateWalletSecretKey(secretKey: Uint8Array, email: string): Promise<void> {
    try {
      // Convertir Uint8Array en Array pour le stockage JSON
      const secretKeyArray = Array.from(secretKey);
      const storeKey = this.getSecureStoreKey(email);

      await SecureStore.setItemAsync(
        storeKey,
        JSON.stringify(secretKeyArray)
      );

      console.log(`🔒 Private wallet secret key saved securely for ${email}`);
    } catch (error) {
      console.error('❌ Error saving secret key:', error);
      throw error;
    }
  }

  /**
   * Récupère la clé secrète du Private Wallet depuis le stockage sécurisé
   *
   * @returns La clé secrète sous forme de Uint8Array, ou null si non trouvée
   */
  async getPrivateWalletSecretKey(): Promise<Uint8Array | null> {
    try {
      const email = await this.getCurrentUserEmail();
      if (!email) {
        console.log('⚠️ No user email found - cannot retrieve private wallet');
        return null;
      }

      const storeKey = this.getSecureStoreKey(email);
      const secretKeyJson = await SecureStore.getItemAsync(storeKey);

      if (!secretKeyJson) {
        console.log(`ℹ️ No private wallet found for ${email}`);
        return null;
      }

      console.log(`✅ Found private wallet for ${email}`);
      const secretKeyArray = JSON.parse(secretKeyJson);
      return new Uint8Array(secretKeyArray);
    } catch (error) {
      console.error('❌ Error retrieving secret key:', error);
      return null;
    }
  }

  /**
   * Crée un Keypair à partir de la clé secrète sauvegardée
   *
   * @returns Le Keypair du Private Wallet, ou null si non trouvé
   */
  async getPrivateWalletKeypair(): Promise<Keypair | null> {
    try {
      const secretKey = await this.getPrivateWalletSecretKey();

      if (!secretKey) {
        return null;
      }

      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      console.error('❌ Error creating Keypair:', error);
      return null;
    }
  }

  /**
   * Supprime les données du Private Wallet de l'utilisateur courant
   */
  async clearPrivateWalletData(): Promise<void> {
    try {
      const email = await this.getCurrentUserEmail();
      if (email) {
        const storeKey = this.getSecureStoreKey(email);
        await SecureStore.deleteItemAsync(storeKey);
        console.log(`🗑️ Private wallet data cleared for ${email}`);
      }
      this.currentUserEmail = null;
    } catch (error) {
      console.error('❌ Error clearing wallet data:', error);
    }
  }

  /**
   * Reset l'état du service (appelé au logout)
   */
  reset(): void {
    this.currentUserEmail = null;
    console.log('🔄 StealfService reset');
  }
}

// Export singleton instance
export default new StealfService();