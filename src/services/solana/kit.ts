import bs58 from 'bs58';
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  isAddress,
  lamports,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  sendAndConfirmTransactionFactory,
  assertIsTransactionWithinSizeLimit,
  pipe,
  airdropFactory,
  AccountRole,
  devnet,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || '';

// Singleton RPC clients
let _rpc: ReturnType<typeof createSolanaRpc> | null = null;
let _rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions> | null = null;

export function getRpc() {
  if (!_rpc) {
    _rpc = createSolanaRpc(devnet(RPC_URL));
  }
  return _rpc;
}

export function getRpcSubscriptions() {
  if (!_rpcSubscriptions) {
    _rpcSubscriptions = createSolanaRpcSubscriptions(devnet(WSS_URL));
  }
  return _rpcSubscriptions;
}

export const LAMPORTS_PER_SOL = 1_000_000_000;

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

export function lamportsToSol(lamps: bigint | number): number {
  return Number(lamps) / LAMPORTS_PER_SOL;
}

export async function createSignerFromBase58(privateKeyBase58: string): Promise<KeyPairSigner> {
  const keyBytes = bs58.decode(privateKeyBase58);

  const privateKeyBytes = keyBytes.length === 64 ? keyBytes.slice(0, 32) : keyBytes;
  return createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);
}

export function validateAddress(addr: string): boolean {
  return isAddress(addr);
}

export function toAddress(addr: string): Address {
  return address(addr);
}

export {
  address,
  isAddress,
  lamports,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  sendAndConfirmTransactionFactory,
  assertIsTransactionWithinSizeLimit,
  pipe,
  airdropFactory,
  AccountRole,
};
export type { Address, KeyPairSigner };
