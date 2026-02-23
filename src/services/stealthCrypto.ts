/**
 * stealthCrypto — Couche crypto stealth côté frontend.
 *
 * Implémentation EIP-5564 adaptée ed25519/X25519 pour Solana.
 * Toutes les clés privées restent dans expo-secure-store (jamais envoyées au backend sauf
 * la viewing private key qui est transmise UNE FOIS chiffrée côté backend pour le scanning).
 *
 * Requirements : 1.1, 1.3, 4.1, 4.2, 4.4, 5.1, 5.2, 5.6
 */

import { ed25519, x25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import * as SecureStore from 'expo-secure-store';
import bs58 from 'bs58';

// --- Constantes SecureStore ---

const STEALTH_SPENDING_SEED_KEY = 'stealth_spending_seed';
const STEALTH_VIEWING_PRIV_KEY = 'stealth_viewing_priv';
const STEALTH_META_ADDRESS_KEY = 'stealth_meta_address';

/** Ordre de la courbe ed25519 */
const L = ed25519.CURVE.n;

// --- Helpers ---

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

export interface StealthKeys {
  /** Meta-adresse publique partageable : base58(spendingPub || viewingPub) — 64 bytes */
  metaAddress: string;
  /** Viewing public key en base58 (partageable) */
  viewingPublicKey: string;
  /** Viewing private key en hex (à envoyer au backend UNE FOIS pour le scanning) */
  viewingPrivateKeyHex: string;
  /** Spending public key en base58 (partageable) */
  spendingPublicKey: string;
}

export interface SpendSignResult {
  /** Transaction serialisée signée, en base64 */
  serializedSignedTx: string;
}

// --- API publique ---

/**
 * Génère des clés stealth, les persiste dans SecureStore, et retourne les clés publiques.
 * La spending SEED (32 bytes) et la viewing private key (32 bytes) sont stockées localement.
 *
 * IMPORTANT : viewingPrivateKeyHex doit être envoyé au backend UNE SEULE FOIS via POST /api/stealth/register.
 * Le backend le chiffre (AES-256-GCM) et l'utilise uniquement pour le scanning.
 */
export async function generateAndStoreKeys(): Promise<StealthKeys> {
  // Générer les keypairs
  const spendingSeed = ed25519.utils.randomPrivateKey(); // 32 bytes
  const spendingPub = ed25519.getPublicKey(spendingSeed);

  const viewingPriv = x25519.utils.randomPrivateKey(); // 32 bytes
  const viewingPub = x25519.getPublicKey(viewingPriv);

  // Meta-adresse = base58(spendingPub || viewingPub)
  const combined = new Uint8Array(64);
  combined.set(spendingPub, 0);
  combined.set(viewingPub, 32);
  const metaAddress = bs58.encode(combined);

  // Persister dans SecureStore (AES-256-GCM by platform)
  await SecureStore.setItemAsync(
    STEALTH_SPENDING_SEED_KEY,
    Buffer.from(spendingSeed).toString('hex'),
  );
  await SecureStore.setItemAsync(
    STEALTH_VIEWING_PRIV_KEY,
    Buffer.from(viewingPriv).toString('hex'),
  );
  await SecureStore.setItemAsync(STEALTH_META_ADDRESS_KEY, metaAddress);

  return {
    metaAddress,
    viewingPublicKey: bs58.encode(viewingPub),
    viewingPrivateKeyHex: Buffer.from(viewingPriv).toString('hex'),
    spendingPublicKey: bs58.encode(spendingPub),
  };
}

/**
 * Lit la meta-adresse stockée dans SecureStore.
 * Retourne null si les clés n'ont pas encore été générées.
 */
export async function getStoredMetaAddress(): Promise<string | null> {
  return SecureStore.getItemAsync(STEALTH_META_ADDRESS_KEY);
}

/**
 * Supprime toutes les clés stealth du SecureStore (déconnexion / reset).
 */
export async function clearStealthKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(STEALTH_SPENDING_SEED_KEY);
  await SecureStore.deleteItemAsync(STEALTH_VIEWING_PRIV_KEY);
  await SecureStore.deleteItemAsync(STEALTH_META_ADDRESS_KEY);
}

/**
 * Signe une transaction de dépense stealth.
 *
 * Algorithme :
 *   1. Lire spending_seed et viewing_priv depuis SecureStore
 *   2. S = X25519(viewing_priv, ephemeralR)
 *   3. h = SHA256(S), h_scalar = bytesToBigIntLE(h) mod L
 *   4. spending_scalar = ed25519.utils.getExtendedPublicKey(spending_seed).scalar
 *   5. p_stealth = (spending_scalar + h_scalar) mod L
 *   6. Vérifier que p_stealth*G == stealthAddress (guard contra mismatch)
 *   7. Signer le message TX avec p_stealth (ed25519 low-level)
 *   8. Effacer p_stealth de la mémoire JS (set to 0n)
 *
 * @param serializedUnsignedTx - TX non-signée en base64
 * @param ephemeralR - Clé éphémère de l'expéditeur en base58
 * @param expectedStealthAddress - Adresse stealth attendue (vérification anti-mismatch)
 */
export async function signSpendTransaction(
  serializedUnsignedTx: string,
  ephemeralR: string,
  expectedStealthAddress: string,
): Promise<SpendSignResult> {
  // Lire les clés depuis SecureStore
  const spendingSeedHex = await SecureStore.getItemAsync(STEALTH_SPENDING_SEED_KEY);
  const viewingPrivHex = await SecureStore.getItemAsync(STEALTH_VIEWING_PRIV_KEY);

  if (!spendingSeedHex || !viewingPrivHex) {
    throw new Error('Stealth keys not found in SecureStore — run generateAndStoreKeys() first');
  }

  const spendingSeed = new Uint8Array(Buffer.from(spendingSeedHex, 'hex'));
  const viewingPriv = new Uint8Array(Buffer.from(viewingPrivHex, 'hex'));
  const ephemeralPub = new Uint8Array(bs58.decode(ephemeralR));

  // Recomputer le shared secret et h_scalar
  const S = x25519.getSharedSecret(viewingPriv, ephemeralPub);
  const h = sha256(S);
  const hScalar = bytesToBigIntLE(h) % L;

  // Spending scalar depuis le seed (SHA-512 + clamping interne)
  const { scalar: spendingScalar } = ed25519.utils.getExtendedPublicKey(spendingSeed);

  // p_stealth = (spending_scalar + h_scalar) mod L
  let pStealth = (spendingScalar + hScalar) % L;

  // Vérification anti-mismatch : p_stealth*G doit correspondre à expectedStealthAddress
  const derivedStealthPub = ed25519.ExtendedPoint.BASE.multiply(pStealth).toRawBytes();
  const derivedStealthAddr = bs58.encode(derivedStealthPub);
  if (derivedStealthAddr !== expectedStealthAddress) {
    pStealth = 0n; // Effacer le scalaire
    throw new Error('Stealth address mismatch — refusing to sign (wrong ephemeralR or keys)');
  }

  // Désérialiser la TX
  const { Transaction, PublicKey } = await import('@solana/web3.js');
  const txBytes = Buffer.from(serializedUnsignedTx, 'base64');
  const tx = Transaction.from(txBytes);

  // Signer le message TX avec p_stealth (ed25519 RFC-8032 low-level)
  const messageBytes = new Uint8Array(tx.serializeMessage());
  const signature = signWithScalar(pStealth, spendingSeed, derivedStealthPub, messageBytes);

  // Effacer le scalaire (best-effort en JS)
  pStealth = 0n;

  // Ajouter la signature à la TX
  const stealthPubkey = new PublicKey(derivedStealthPub);
  tx.addSignature(stealthPubkey, new Uint8Array(signature) as unknown as Buffer);

  return {
    serializedSignedTx: tx.serialize({ requireAllSignatures: false }).toString('base64'),
  };
}

/**
 * Implémentation ed25519 signing avec un scalaire brut (RFC 8032).
 *
 * Nonce déterministe : SHA-512(SHA-512(spending_seed)[32:] || message)
 * Ce nonce est unique par (spending_seed, message) et sécurisé.
 *
 * @internal — utilisé uniquement par signSpendTransaction
 */
function signWithScalar(
  scalar: bigint,
  spendingSeed: Uint8Array,
  publicKey: Uint8Array,
  message: Uint8Array,
): Uint8Array {
  // Nonce prefix = deuxième moitié de SHA-512(spending_seed)
  const expandedSeed = sha512(spendingSeed);
  const noncePrefix = expandedSeed.slice(32); // bytes 32-63

  // r = SHA-512(nonce_prefix || message) mod L — déterministe
  const rHash = sha512(concat(noncePrefix, message));
  const r = bytesToBigIntLE(rHash) % L;

  // R = r * G
  const R = ed25519.ExtendedPoint.BASE.multiply(r);
  const R_bytes = R.toRawBytes();

  // k = SHA-512(R || pubKey || message) mod L
  const kHash = sha512(concat(R_bytes, publicKey, message));
  const k = bytesToBigIntLE(kHash) % L;

  // S = (r + k * scalar) mod L
  const S = (r + k * scalar) % L;
  const S_bytes = bigIntToBytesLE(S, 32);

  // Signature = R_bytes (32) || S_bytes (32)
  return concat(R_bytes, S_bytes);
}
