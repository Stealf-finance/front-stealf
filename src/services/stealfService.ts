import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from './authStorage';
import { UMBRA_CONFIG } from '../config/umbra';

/**
 * Service pour gérer le Private Wallet (wallet Solana séparé)
 *
 * Ce service permet de :
 * 1. Créer un Private Wallet (simple Keypair Solana)
 * 2. Stocker et récupérer la clé privée sur le serveur (chiffrée)
 * 3. Gérer le Private Wallet indépendamment du wallet public
 *
 * IMPORTANT: Le wallet privé est stocké côté serveur pour être accessible sur tous les devices
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
   * Génère la clé SecureStore locale pour un utilisateur spécifique (cache local)
   * IMPORTANT: Returns null if no email provided to prevent using wrong key
   */
  private getSecureStoreKey(email: string | null): string | null {
    if (!email) {
      console.warn('⚠️ StealfService: No email provided for secure key');
      return null;
    }
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    return `privateWallet_${safeEmail}`;
  }

  /**
   * Chiffre la clé secrète (simple base64 pour beta - à améliorer en prod)
   */
  private encryptSecretKey(secretKey: Uint8Array): string {
    // Pour la beta, on utilise base64. En prod, utiliser une vraie encryption
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

      // Sauvegarder sur le serveur
      await this.savePrivateWalletToServer(privateWallet, email);

      // Sauvegarder aussi en local (cache)
      await this.savePrivateWalletLocally(privateWallet.secretKey, email);

      return privateWallet;
    } catch (error) {
      console.error('❌ Error creating Private Wallet:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde le Private Wallet sur le serveur
   */
  private async savePrivateWalletToServer(wallet: Keypair, email: string): Promise<void> {
    try {
      const encryptedKey = this.encryptSecretKey(wallet.secretKey);

      const response = await fetch(`${UMBRA_CONFIG.API_URL}/api/users/private-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          privateWalletAddress: wallet.publicKey.toBase58(),
          encryptedPrivateWalletKey: encryptedKey,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.warn('⚠️ Failed to save private wallet to server:', data.message);
      } else {
        console.log('☁️ Private wallet saved to server');
      }
    } catch (error) {
      console.error('❌ Error saving to server:', error);
      // Ne pas bloquer si le serveur échoue
    }
  }

  /**
   * Sauvegarde la clé secrète localement (cache)
   */
  private async savePrivateWalletLocally(secretKey: Uint8Array, email: string): Promise<void> {
    try {
      const storeKey = this.getSecureStoreKey(email);
      if (!storeKey) {
        console.warn('⚠️ Cannot save private wallet locally: no email');
        return;
      }

      const secretKeyArray = Array.from(secretKey);
      await SecureStore.setItemAsync(
        storeKey,
        JSON.stringify(secretKeyArray)
      );

      console.log(`🔒 Private wallet cached locally for ${email}`);
    } catch (error) {
      console.error('❌ Error saving locally:', error);
    }
  }

  /**
   * Récupère le Private Wallet depuis le serveur
   */
  private async getPrivateWalletFromServer(email: string): Promise<Uint8Array | null> {
    try {
      const response = await fetch(
        `${UMBRA_CONFIG.API_URL}/api/users/private-wallet?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success && data.hasPrivateWallet && data.encryptedPrivateWalletKey) {
        console.log('☁️ Private wallet retrieved from server');
        const secretKey = this.decryptSecretKey(data.encryptedPrivateWalletKey);

        // Sauvegarder en local pour cache
        await this.savePrivateWalletLocally(secretKey, email);

        return secretKey;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching from server:', error);
      return null;
    }
  }

  /**
   * Récupère la clé secrète du Private Wallet (local puis serveur)
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

      // 1. Essayer le cache local d'abord
      const storeKey = this.getSecureStoreKey(email);
      if (storeKey) {
        const secretKeyJson = await SecureStore.getItemAsync(storeKey);

        if (secretKeyJson) {
          console.log(`✅ Found private wallet in local cache for ${email}`);
          const secretKeyArray = JSON.parse(secretKeyJson);
          return new Uint8Array(secretKeyArray);
        }
      }

      // 2. Sinon, récupérer depuis le serveur
      console.log(`🔍 Fetching private wallet from server for ${email}...`);
      const serverKey = await this.getPrivateWalletFromServer(email);

      if (serverKey) {
        return serverKey;
      }

      console.log(`ℹ️ No private wallet found for ${email}`);
      return null;
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
   * Supprime les données du Private Wallet de l'utilisateur courant (local seulement)
   */
  async clearPrivateWalletData(): Promise<void> {
    try {
      const email = await this.getCurrentUserEmail();
      if (email) {
        const storeKey = this.getSecureStoreKey(email);
        if (storeKey) {
          await SecureStore.deleteItemAsync(storeKey);
          console.log(`🗑️ Private wallet local cache cleared for ${email}`);
        }
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
