import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SOLANA_CONFIG } from '../config/umbra';

// IDL du programme bolt_instant_transfer
import BoltInstantTransferIDL from './idl/bolt_instant_transfer.json';

export type BoltInstantTransfer = anchor.Program<typeof BoltInstantTransferIDL>;

/**
 * Types d'endpoints Ephemeral Rollup disponibles
 */
export type EREndpoint = 'local' | 'asia' | 'eu' | 'us' | 'tee';

/**
 * Configuration des endpoints Ephemeral Rollup
 * MagicBlock Public Validators for Devnet
 */
const ER_ENDPOINTS = {
  local: {
    rpc: 'http://127.0.0.1:8899',
    ws: 'ws://127.0.0.1:8900',
    validator: new PublicKey('mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev'),
  },
  asia: {
    rpc: 'https://devnet-as.magicblock.app',
    ws: 'wss://devnet-as.magicblock.app',
    validator: new PublicKey('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57'),
  },
  eu: {
    rpc: 'https://devnet-eu.magicblock.app',
    ws: 'wss://devnet-eu.magicblock.app',
    validator: new PublicKey('MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e'),
  },
  us: {
    rpc: 'https://devnet-us.magicblock.app',
    ws: 'wss://devnet-us.magicblock.app',
    validator: new PublicKey('MUS3hc9TCw4cGC12vHNoYcCGzJgQLZWVoeNHNd'),
  },
  tee: {
    rpc: 'https://tee.magicblock.app',
    ws: 'wss://tee.magicblock.app',
    validator: new PublicKey('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA'),
  },
};

/**
 * Configuration des Ephemeral Rollups
 */
const ER_CONFIG = {
  // Base Layer (Solana Devnet)
  BASE_LAYER_RPC: SOLANA_CONFIG.RPC_URL,

  // Programme bolt_instant_transfer
  PROGRAM_ID: new PublicKey('5QtWKtEg9aZJBrnx3d4FcvXto7QG2ELoQEQzoQPipvnh'),

  // Seed pour le PDA
  TRANSFER_SEED: 'transfer',

  // Endpoint par défaut (EU pour meilleure latence Europe)
  DEFAULT_ENDPOINT: 'eu' as EREndpoint,
};

/**
 * Service pour gérer les transactions Ephemeral Rollup
 * Permet des transactions SOL ultra-rapides (~80ms) via Magic Block ER
 */
class EphemeralRollupService {
  private baseConnection: Connection;
  private erConnection: Connection;
  private program: Program | null = null;
  private erProgram: Program | null = null;
  private currentEndpoint: EREndpoint;

  constructor(endpoint: EREndpoint = ER_CONFIG.DEFAULT_ENDPOINT) {
    // Connexion Base Layer (Devnet)
    this.baseConnection = new Connection(ER_CONFIG.BASE_LAYER_RPC, 'confirmed');

    // Initialiser avec l'endpoint par défaut
    this.currentEndpoint = endpoint;
    const endpointConfig = ER_ENDPOINTS[endpoint];

    // Connexion Ephemeral Rollup
    this.erConnection = new Connection(endpointConfig.rpc, {
      wsEndpoint: endpointConfig.ws,
      commitment: 'processed',
    });

    console.log(`🌐 Ephemeral Rollup Service initialized with endpoint: ${endpoint.toUpperCase()}`);
    console.log(`   RPC: ${endpointConfig.rpc}`);
    console.log(`   Validator: ${endpointConfig.validator.toBase58()}`);
  }

  /**
   * Change l'endpoint ER utilisé
   */
  setEndpoint(endpoint: EREndpoint): void {
    this.currentEndpoint = endpoint;
    const endpointConfig = ER_ENDPOINTS[endpoint];

    // Recréer la connexion ER
    this.erConnection = new Connection(endpointConfig.rpc, {
      wsEndpoint: endpointConfig.ws,
      commitment: 'processed',
    });

    // Réinitialiser les programmes
    this.program = null;
    this.erProgram = null;

    console.log(`🔄 Switched to ${endpoint.toUpperCase()} endpoint`);
  }

  /**
   * Récupère l'endpoint actuellement utilisé
   */
  getCurrentEndpoint(): EREndpoint {
    return this.currentEndpoint;
  }

  /**
   * Récupère le validator identity pour l'endpoint actuel
   */
  private getValidatorIdentity(): PublicKey {
    return ER_ENDPOINTS[this.currentEndpoint].validator;
  }

  /**
   * Initialise le programme Anchor avec le wallet
   */
  private initializeProgram(wallet: Keypair): void {
    // Provider pour Base Layer
    const baseProvider = new AnchorProvider(
      this.baseConnection,
      new anchor.Wallet(wallet),
      { commitment: 'confirmed' }
    );

    // Provider pour ER
    const erProvider = new AnchorProvider(
      this.erConnection,
      new anchor.Wallet(wallet),
      { commitment: 'processed' }
    );

    this.program = new Program(
      BoltInstantTransferIDL as any,
      ER_CONFIG.PROGRAM_ID,
      baseProvider
    );

    this.erProgram = new Program(
      BoltInstantTransferIDL as any,
      ER_CONFIG.PROGRAM_ID,
      erProvider
    );
  }

  /**
   * Calcule le PDA pour un utilisateur
   */
  private getTransferPDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(ER_CONFIG.TRANSFER_SEED), userPubkey.toBuffer()],
      ER_CONFIG.PROGRAM_ID
    );
  }

  /**
   * Étape 1: Initialize transfer sur Base Layer
   * Crée un PDA avec les détails du transfert
   */
  async initializeTransfer(
    senderWallet: Keypair,
    recipientAddress: string,
    amountSOL: number
  ): Promise<string> {
    try {
      console.log('🚀 [ER] Step 1: Initializing transfer on Base Layer...');

      this.initializeProgram(senderWallet);
      if (!this.program) throw new Error('Program not initialized');

      const recipientPubkey = new PublicKey(recipientAddress);
      const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

      const [transferPDA] = this.getTransferPDA(senderWallet.publicKey);
      console.log(`   Transfer PDA: ${transferPDA.toString()}`);

      const start = Date.now();

      let tx = await this.program.methods
        .initialize(recipientPubkey, new anchor.BN(lamports))
        .accounts({
          user: senderWallet.publicKey,
        })
        .transaction();

      tx.feePayer = senderWallet.publicKey;
      tx.recentBlockhash = (await this.baseConnection.getLatestBlockhash()).blockhash;
      tx.sign(senderWallet);

      const signature = await this.baseConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      await this.baseConnection.confirmTransaction(signature, 'confirmed');

      const duration = Date.now() - start;
      console.log(`✅ [ER] Initialized in ${duration}ms - Signature: ${signature}`);

      return signature;
    } catch (error) {
      console.error('❌ [ER] Error initializing transfer:', error);
      throw error;
    }
  }

  /**
   * Étape 2: Delegate transfer to ER
   * Délègue le PDA à l'Ephemeral Rollup
   */
  async delegateToER(senderWallet: Keypair): Promise<string> {
    try {
      console.log('🚀 [ER] Step 2: Delegating to Ephemeral Rollup...');

      if (!this.program) throw new Error('Program not initialized');

      const [transferPDA] = this.getTransferPDA(senderWallet.publicKey);

      const start = Date.now();

      // remainingAccounts pour le validator identity (dynamique selon endpoint)
      const validatorIdentity = this.getValidatorIdentity();
      const remainingAccounts = [
        {
          pubkey: validatorIdentity,
          isSigner: false,
          isWritable: false,
        },
      ];

      console.log(`   Using validator: ${validatorIdentity.toBase58()}`);

      let tx = await this.program.methods
        .delegate(senderWallet.publicKey)
        .accounts({
          payer: senderWallet.publicKey,
        })
        .remainingAccounts(remainingAccounts)
        .transaction();

      tx.feePayer = senderWallet.publicKey;
      tx.recentBlockhash = (await this.baseConnection.getLatestBlockhash()).blockhash;
      tx.sign(senderWallet);

      const signature = await this.baseConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      await this.baseConnection.confirmTransaction(signature, 'confirmed');

      const duration = Date.now() - start;
      console.log(`✅ [ER] Delegated in ${duration}ms - Signature: ${signature}`);
      console.log('   ⚡ Account now delegated to Ephemeral Rollup!');

      return signature;
    } catch (error) {
      console.error('❌ [ER] Error delegating to ER:', error);
      throw error;
    }
  }

  /**
   * Étape 3: Execute INSTANT transfer on ER 🚀
   * Exécute le transfert sur l'Ephemeral Rollup (sub-100ms!)
   */
  async executeInstantTransfer(
    senderWallet: Keypair,
    recipientAddress: string
  ): Promise<{ signature: string; duration: number }> {
    try {
      console.log('🚀 [ER] Step 3: Executing INSTANT transfer on Ephemeral Rollup...');

      if (!this.erProgram) throw new Error('ER Program not initialized');

      const recipientPubkey = new PublicKey(recipientAddress);

      // Attendre 3 secondes pour que le compte soit synchronisé sur ER
      console.log('   ⏳ Waiting for account sync to ER...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Construire la transaction
      let tx = await this.erProgram.methods
        .instantTransfer()
        .accounts({
          sender: senderWallet.publicKey,
          recipient: recipientPubkey,
        })
        .transaction();

      tx.feePayer = senderWallet.publicKey;
      tx.recentBlockhash = (await this.erConnection.getLatestBlockhash()).blockhash;
      tx.sign(senderWallet);

      // Mesurer uniquement le temps d'envoi + confirmation
      const start = Date.now();

      const signature = await this.erConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      await this.erConnection.confirmTransaction(signature, 'processed');

      const duration = Date.now() - start;

      console.log(`✅ [ER] INSTANT transfer completed in ${duration}ms! 🎉`);
      console.log(`   Signature: ${signature}`);

      return { signature, duration };
    } catch (error) {
      console.error('❌ [ER] Error executing instant transfer:', error);
      throw error;
    }
  }

  /**
   * Workflow complet: Execute un transfert instantané via ER
   * Combine les 3 étapes: Initialize -> Delegate -> Instant Transfer
   */
  async executeFullERTransfer(
    senderWallet: Keypair,
    recipientAddress: string,
    amountSOL: number,
    onProgress?: (step: string, signature?: string) => void
  ): Promise<{
    initSignature: string;
    delegateSignature: string;
    transferSignature: string;
    transferDuration: number;
  }> {
    try {
      console.log('🌟 [ER] Starting full Ephemeral Rollup transfer workflow...');
      console.log(`   From: ${senderWallet.publicKey.toBase58()}`);
      console.log(`   To: ${recipientAddress}`);
      console.log(`   Amount: ${amountSOL} SOL`);

      // Step 1: Initialize
      onProgress?.('Initializing transfer...');
      const initSignature = await this.initializeTransfer(
        senderWallet,
        recipientAddress,
        amountSOL
      );
      onProgress?.('Initialized', initSignature);

      // Step 2: Delegate
      onProgress?.('Delegating to Ephemeral Rollup...');
      const delegateSignature = await this.delegateToER(senderWallet);
      onProgress?.('Delegated', delegateSignature);

      // Step 3: Instant Transfer
      onProgress?.('Executing instant transfer...');
      const { signature: transferSignature, duration: transferDuration } =
        await this.executeInstantTransfer(senderWallet, recipientAddress);
      onProgress?.('Completed', transferSignature);

      console.log('🎉 [ER] Full workflow completed successfully!');
      console.log(`   Final transfer speed: ${transferDuration}ms`);

      return {
        initSignature,
        delegateSignature,
        transferSignature,
        transferDuration,
      };
    } catch (error) {
      console.error('❌ [ER] Full workflow failed:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'Ephemeral Rollup est disponible
   */
  async checkERAvailability(): Promise<boolean> {
    try {
      // Test avec getLatestBlockhash au lieu de getHealth
      await this.erConnection.getLatestBlockhash();
      return true;
    } catch (error) {
      console.warn('⚠️ Ephemeral Rollup not available:', error);
      return false;
    }
  }

  /**
   * Teste la latence d'un endpoint ER
   */
  async testEndpointLatency(endpoint: EREndpoint): Promise<number | null> {
    try {
      const endpointConfig = ER_ENDPOINTS[endpoint];
      const testConnection = new Connection(endpointConfig.rpc, 'processed');

      const start = Date.now();
      await testConnection.getLatestBlockhash();
      const latency = Date.now() - start;

      console.log(`📊 ${endpoint.toUpperCase()} latency: ${latency}ms`);
      return latency;
    } catch (error) {
      console.warn(`⚠️ Failed to test ${endpoint} endpoint:`, error);
      return null;
    }
  }

  /**
   * Trouve le meilleur endpoint (latence la plus faible)
   */
  async findBestEndpoint(): Promise<EREndpoint> {
    console.log('🔍 Testing all Ephemeral Rollup endpoints...');

    const endpoints: EREndpoint[] = ['asia', 'eu', 'us', 'tee'];
    const latencies: { endpoint: EREndpoint; latency: number }[] = [];

    for (const endpoint of endpoints) {
      const latency = await this.testEndpointLatency(endpoint);
      if (latency !== null) {
        latencies.push({ endpoint, latency });
      }
    }

    if (latencies.length === 0) {
      console.warn('⚠️ No ER endpoints available, falling back to default');
      return ER_CONFIG.DEFAULT_ENDPOINT;
    }

    // Trier par latence croissante
    latencies.sort((a, b) => a.latency - b.latency);

    const best = latencies[0];
    console.log(`✅ Best endpoint: ${best.endpoint.toUpperCase()} (${best.latency}ms)`);

    return best.endpoint;
  }

  /**
   * Liste tous les endpoints disponibles
   */
  getAvailableEndpoints(): EREndpoint[] {
    return Object.keys(ER_ENDPOINTS) as EREndpoint[];
  }

  /**
   * Récupère le statut d'un transfert
   */
  async getTransferStatus(userPubkey: PublicKey): Promise<any> {
    try {
      if (!this.program) throw new Error('Program not initialized');

      const [transferPDA] = this.getTransferPDA(userPubkey);
      // @ts-ignore - IDL types not fully generated
      const accountInfo = await this.program.account.transferState.fetch(transferPDA);

      return accountInfo;
    } catch (error) {
      console.error('❌ Error fetching transfer status:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new EphemeralRollupService();
