/**
 * Test script pour créer un wallet Solana et demander un airdrop
 * Usage: npx tsx test-airdrop.ts
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

async function createWalletAndRequestAirdrop() {
  console.log('🔑 Creating new Solana wallet...');

  // Créer un nouveau wallet
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const secretKey = bs58.encode(keypair.secretKey);

  console.log('\n✅ Wallet created!');
  console.log('   Public Key:', publicKey);
  console.log('   Secret Key:', secretKey);
  console.log('\n⚠️  SAVE THIS SECRET KEY SECURELY!\n');

  // Se connecter au réseau devnet
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  console.log('🪂 Requesting 2 SOL airdrop from devnet...');

  try {
    // Demander 2 SOL (devnet permet max 2 SOL par airdrop)
    const signature = await connection.requestAirdrop(
      keypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    console.log('   Transaction signature:', signature);
    console.log('   Waiting for confirmation...');

    // Attendre la confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('✅ Airdrop confirmed!');

    // Vérifier le solde
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;

    console.log(`\n💰 Wallet balance: ${balanceSOL} SOL`);
    console.log(`   Explorer: https://explorer.solana.com/address/${publicKey}?cluster=devnet`);

  } catch (error: any) {
    console.error('\n❌ Airdrop failed:', error.message);

    if (error.message.includes('429') || error.message.includes('airdrop')) {
      console.log('\n💡 Tip: Devnet rate limits airdrops. Try again in a few minutes.');
      console.log('   Or use the Solana faucet: https://faucet.solana.com/');
    }
  }
}

createWalletAndRequestAirdrop();
