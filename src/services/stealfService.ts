import { WalletLinkClient } from '@stealf/wallet-link-sdk';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import gridClient from '../config/grid';

/**
 * Service pour gérer le Stealf SDK (Private Wallet + MPC)
 *
 * Ce service permet de :
 * 1. Créer et lier un Private Wallet à un Grid Smart Account
 * 2. Récupérer les wallets liés lors du login
 * 3. Gérer le stockage sécurisé des clés privées
 */
class StealfService {
  private client: WalletLinkClient | null = null;

  /**
   * Initialise le client Stealf avec un wrapper Anchor Wallet
   * qui utilise Grid SDK pour les signatures
   */
  private async initializeClient(gridWalletAddress: string) {
    if (this.client) {
      return this.client;
    }

    // Créer un wrapper Anchor Wallet depuis Grid SDK
    // Grid SDK gère déjà les signatures via sessionSecrets
    const wallet = {
      publicKey: new PublicKey(gridWalletAddress),
      signTransaction: async (tx: any) => {
        // Utiliser Grid SDK pour signer
        // Note: Grid SDK a une méthode sign() qui retourne la transaction signée
        const signedTx = await gridClient.sign(tx);
        return signedTx;
      },
      signAllTransactions: async (txs: any[]) => {
        // Signer plusieurs transactions
        return Promise.all(txs.map(tx => gridClient.sign(tx)));
      }
    };

    // Initialiser le client Stealf
    this.client = new WalletLinkClient(wallet as any, {
      environment: 'devnet', // TODO: Changer en 'mainnet' pour la production
    });

    return this.client;
  }

  /**
   * Crée et lie un nouveau Private Wallet au Grid Smart Account
   * Appelé lors du SIGNUP (création de compte)
   *
   * @param gridWalletAddress - Adresse du Grid Smart Account
   * @returns Les informations du Private Wallet créé
   */
  async linkPrivateWallet(gridWalletAddress: string): Promise<{
    signature: string;
    gridWallet: PublicKey;
    privateWallet: Keypair;
  }> {
    try {
      console.log('🔗 Linking Private Wallet to Grid Account...');

      const client = await this.initializeClient(gridWalletAddress);
      const gridWallet = new PublicKey(gridWalletAddress);

      // Créer et lier le Private Wallet
      const result = await client.linkSmartAccountWithPrivateWallet({
        gridWallet,
        onProgress: (status) => {
          console.log(`📊 Progress: ${status}`);
        },
        onComputationQueued: (sig) => {
          console.log(`✅ MPC Computation queued: ${sig}`);
        }
      });

      console.log('✅ Private Wallet linked successfully!');
      console.log(`   Grid Wallet: ${result.gridWallet.toBase58()}`);
      console.log(`   Private Wallet: ${result.privateWallet.publicKey.toBase58()}`);

      // IMPORTANT : Sauvegarder la clé privée de manière sécurisée
      await this.savePrivateWalletSecretKey(result.privateWallet.secretKey);

      return result;
    } catch (error) {
      console.error('❌ Error linking Private Wallet:', error);
      throw error;
    }
  }

  /**
   * Récupère les wallets liés depuis le MPC
   * Appelé lors du LOGIN (utilisateur existant)
   *
   * @param gridWalletAddress - Adresse du Grid Smart Account
   * @returns Les adresses publiques des wallets liés
   */
  async retrieveLinkedWallets(gridWalletAddress: string): Promise<{
    gridWallet: PublicKey;
    privateWallet: PublicKey;
  }> {
    try {
      console.log('🔍 Retrieving linked wallets...');

      const client = await this.initializeClient(gridWalletAddress);

      // Récupérer les wallets liés via MPC re-encryption
      const wallets = await client.retrieveLinkedWallets({
        onProgress: (status) => {
          console.log(`📊 Progress: ${status}`);
        },
        onComputationQueued: (sig) => {
          console.log(`✅ MPC Computation queued: ${sig}`);
        }
      });

      console.log('✅ Wallets retrieved successfully!');
      console.log(`   Grid Wallet: ${wallets.gridWallet.toBase58()}`);
      console.log(`   Private Wallet: ${wallets.privateWallet.toBase58()}`);

      return wallets;
    } catch (error) {
      console.error('❌ Error retrieving wallets:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a déjà des wallets liés
   *
   * @param gridWalletAddress - Adresse du Grid Smart Account
   * @returns true si des wallets sont liés, false sinon
   */
  async hasLinkedWallets(gridWalletAddress: string): Promise<boolean> {
    try {
      const client = await this.initializeClient(gridWalletAddress);
      const hasWallets = await client.hasLinkedWallets();

      console.log(`🔍 Has linked wallets: ${hasWallets}`);
      return hasWallets;
    } catch (error) {
      console.error('❌ Error checking linked wallets:', error);
      return false;
    }
  }

  /**
   * Sauvegarde la clé secrète du Private Wallet de manière sécurisée
   *
   * @param secretKey - Clé secrète du Private Wallet (Uint8Array)
   */
  private async savePrivateWalletSecretKey(secretKey: Uint8Array): Promise<void> {
    try {
      // Convertir Uint8Array en Array pour le stockage JSON
      const secretKeyArray = Array.from(secretKey);

      await SecureStore.setItemAsync(
        'privateWalletSecretKey',
        JSON.stringify(secretKeyArray)
      );

      console.log('🔒 Private wallet secret key saved securely');
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
      const secretKeyJson = await SecureStore.getItemAsync('privateWalletSecretKey');

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
   * Supprime les données du Private Wallet lors de la déconnexion
   */
  async clearPrivateWalletData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('privateWalletSecretKey');
      this.client = null;
      console.log('🗑️ Private wallet data cleared');
    } catch (error) {
      console.error('❌ Error clearing wallet data:', error);
    }
  }
}

// Export singleton instance
export default new StealfService();