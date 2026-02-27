/**
 * cashStealthCrypto — Couche crypto stealth du cash wallet côté frontend.
 *
 * Miroir de stealthCrypto.ts mais dédié au cash wallet (Turnkey).
 * Namespace SecureStore distinct : `cash_stealth_*` (jamais `stealth_*`).
 *
 * Requirements : 1.1, 1.2, 1.3, 1.4, 1.5, 6.3
 */

import { ed25519, x25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import * as SecureStore from 'expo-secure-store';
import bs58 from 'bs58';

// --- Constantes SecureStore (namespace cash — isolé du wealth) ---

const CASH_STEALTH_SPENDING_SEED_KEY = 'cash_stealth_spending_seed';
const CASH_STEALTH_VIEWING_PRIV_KEY = 'cash_stealth_viewing_priv';
const CASH_STEALTH_META_ADDRESS_KEY = 'cash_stealth_meta_address';

/** Ordre de la courbe ed25519 */
const L = ed25519.CURVE.n;

// --- Helpers (identiques à stealthCrypto.ts) ---

function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result |= BigInt(bytes[i]) << (BigInt(i) * 8n);
  }
  return result;
}

function bigIntToBytesLE(n: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let value = n;
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// --- Types ---

export interface CashStealthKeys {
  /** Meta-adresse publique : base58(spendingPub || viewingPub) — 64 bytes */
  metaAddress: string;
  /** Viewing public key en base58 */
  viewingPublicKey: string;
  /** Viewing private key en hex — à envoyer au backend UNE FOIS via POST /api/stealth/register-cash */
  viewingPrivateKeyHex: string;
  /** Spending public key en base58 */
  spendingPublicKey: string;
}

export interface CashSpendSignResult {
  /** Transaction serialisée signée, en base64 */
  serializedSignedTx: string;
}

// --- API publique ---

/**
 * Génère des clés stealth pour le cash wallet, les persiste dans SecureStore
 * sous le namespace `cash_stealth_*`, et retourne les clés publiques.
 */
export async function generateAndStoreCashKeys(): Promise<CashStealthKeys> {
  const spendingSeed = ed25519.utils.randomPrivateKey(); // 32 bytes
  const spendingPub = ed25519.getPublicKey(spendingSeed);

  const viewingPriv = x25519.utils.randomPrivateKey(); // 32 bytes
  const viewingPub = x25519.getPublicKey(viewingPriv);

  const combined = new Uint8Array(64);
  combined.set(spendingPub, 0);
  combined.set(viewingPub, 32);
  const metaAddress = bs58.encode(combined);

  await SecureStore.setItemAsync(
    CASH_STEALTH_SPENDING_SEED_KEY,
    Buffer.from(spendingSeed).toString('hex'),
  );
  await SecureStore.setItemAsync(
    CASH_STEALTH_VIEWING_PRIV_KEY,
    Buffer.from(viewingPriv).toString('hex'),
  );
  await SecureStore.setItemAsync(CASH_STEALTH_META_ADDRESS_KEY, metaAddress);

  return {
    metaAddress,
    viewingPublicKey: bs58.encode(viewingPub),
    viewingPrivateKeyHex: Buffer.from(viewingPriv).toString('hex'),
    spendingPublicKey: bs58.encode(spendingPub),
  };
}

/**
 * Lit la meta-adresse cash stockée dans SecureStore.
 * Retourne null si les clés n'ont pas encore été générées.
 */
export async function getStoredCashMetaAddress(): Promise<string | null> {
  return SecureStore.getItemAsync(CASH_STEALTH_META_ADDRESS_KEY);
}

/**
 * Supprime toutes les clés stealth du cash wallet du SecureStore.
 */
export async function clearCashStealthKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(CASH_STEALTH_SPENDING_SEED_KEY);
  await SecureStore.deleteItemAsync(CASH_STEALTH_VIEWING_PRIV_KEY);
  await SecureStore.deleteItemAsync(CASH_STEALTH_META_ADDRESS_KEY);
}

/**
 * Signe une transaction de dépense stealth cash.
 *
 * Algorithme (identique à signSpendTransaction dans stealthCrypto.ts) :
 *   1. Lire cash_stealth_spending_seed et cash_stealth_viewing_priv depuis SecureStore
 *   2. S = X25519(viewing_priv, ephemeralR)
 *   3. h = SHA256(S), h_scalar = bytesToBigIntLE(h) mod L
 *   4. spending_scalar = ed25519.utils.getExtendedPublicKey(spending_seed).scalar
 *   5. p_stealth = (spending_scalar + h_scalar) mod L
 *   6. Vérifier que p_stealth*G == expectedStealthAddress (guard anti-mismatch)
 *   7. Signer le message TX avec p_stealth
 *   8. Effacer p_stealth de la mémoire JS
 */
export async function signCashSpendTransaction(
  serializedUnsignedTx: string,
  ephemeralR: string,
  expectedStealthAddress: string,
): Promise<CashSpendSignResult> {
  const spendingSeedHex = await SecureStore.getItemAsync(CASH_STEALTH_SPENDING_SEED_KEY);
  const viewingPrivHex = await SecureStore.getItemAsync(CASH_STEALTH_VIEWING_PRIV_KEY);

  if (!spendingSeedHex || !viewingPrivHex) {
    throw new Error('Cash stealth keys not found in SecureStore — run generateAndStoreCashKeys() first');
  }

  const spendingSeed = new Uint8Array(Buffer.from(spendingSeedHex, 'hex'));
  const viewingPriv = new Uint8Array(Buffer.from(viewingPrivHex, 'hex'));
  const ephemeralPub = new Uint8Array(bs58.decode(ephemeralR));

  const S = x25519.getSharedSecret(viewingPriv, ephemeralPub);
  const h = sha256(S);
  const hScalar = bytesToBigIntLE(h) % L;

  const { scalar: spendingScalar } = ed25519.utils.getExtendedPublicKey(spendingSeed);

  let pStealth = (spendingScalar + hScalar) % L;

  const derivedStealthPub = ed25519.ExtendedPoint.BASE.multiply(pStealth).toRawBytes();
  const derivedStealthAddr = bs58.encode(derivedStealthPub);
  if (derivedStealthAddr !== expectedStealthAddress) {
    pStealth = 0n;
    throw new Error('Cash stealth address mismatch — refusing to sign (wrong ephemeralR or keys)');
  }

  const { Transaction, PublicKey } = await import('@solana/web3.js');
  const txBytes = Buffer.from(serializedUnsignedTx, 'base64');
  const tx = Transaction.from(txBytes);

  const messageBytes = new Uint8Array(tx.serializeMessage());
  const signature = signWithScalar(pStealth, spendingSeed, derivedStealthPub, messageBytes);

  pStealth = 0n;

  const stealthPubkey = new PublicKey(derivedStealthPub);
  tx.addSignature(stealthPubkey, new Uint8Array(signature) as unknown as Buffer);

  return {
    serializedSignedTx: tx.serialize({ requireAllSignatures: false }).toString('base64'),
  };
}

/**
 * Implémentation ed25519 signing avec un scalaire brut (RFC 8032).
 * @internal — utilisé uniquement par signCashSpendTransaction
 */
function signWithScalar(
  scalar: bigint,
  spendingSeed: Uint8Array,
  publicKey: Uint8Array,
  message: Uint8Array,
): Uint8Array {
  const expandedSeed = sha512(spendingSeed);
  const noncePrefix = expandedSeed.slice(32);

  const rHash = sha512(concat(noncePrefix, message));
  const r = bytesToBigIntLE(rHash) % L;

  const R = ed25519.ExtendedPoint.BASE.multiply(r);
  const R_bytes = R.toRawBytes();

  const kHash = sha512(concat(R_bytes, publicKey, message));
  const k = bytesToBigIntLE(kHash) % L;

  const S = (r + k * scalar) % L;
  const S_bytes = bigIntToBytesLE(S, 32);

  return concat(R_bytes, S_bytes);
}
