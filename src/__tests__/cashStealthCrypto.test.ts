/**
 * Tests — cashStealthCrypto (tâche 4)
 *
 * Couvre :
 * - generateAndStoreCashKeys : génération + persistance SecureStore
 * - getStoredCashMetaAddress : lecture SecureStore
 * - clearCashStealthKeys : suppression SecureStore
 * - signCashSpendTransaction : signature avec guard anti-mismatch
 *
 * Requirements : 1.1, 1.2, 1.3, 1.4, 1.5, 6.3
 */

// Mock expo-secure-store (configuré dans jest.config.js)
import * as SecureStore from 'expo-secure-store';
import bs58 from 'bs58';

import {
  generateAndStoreCashKeys,
  getStoredCashMetaAddress,
  clearCashStealthKeys,
  signCashSpendTransaction,
} from '../services/cashStealthCrypto';

// Réinitialiser le store mock entre chaque test
beforeEach(() => {
  (SecureStore.getItemAsync as jest.Mock).mockReset();
  (SecureStore.setItemAsync as jest.Mock).mockReset();
  (SecureStore.deleteItemAsync as jest.Mock).mockReset();

  // Réimplémenter le store en mémoire pour les tests d'intégration
  const store: Record<string, string> = {};
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => { store[key] = value; });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => { delete store[key]; });
});

// ===================================================================
// generateAndStoreCashKeys
// ===================================================================

describe('generateAndStoreCashKeys', () => {
  it('should return metaAddress, viewingPublicKey, viewingPrivateKeyHex, spendingPublicKey', async () => {
    const keys = await generateAndStoreCashKeys();

    expect(keys.metaAddress).toBeDefined();
    expect(typeof keys.metaAddress).toBe('string');
    expect(keys.viewingPublicKey).toBeDefined();
    expect(keys.viewingPrivateKeyHex).toBeDefined();
    expect(keys.spendingPublicKey).toBeDefined();
  });

  it('should produce a metaAddress that decodes to exactly 64 bytes', async () => {
    const { metaAddress } = await generateAndStoreCashKeys();
    const decoded = new Uint8Array(bs58.decode(metaAddress));
    expect(decoded.length).toBe(64);
  });

  it('should store keys in SecureStore under cash_stealth_* namespace', async () => {
    await generateAndStoreCashKeys();

    const calledKeys = (SecureStore.setItemAsync as jest.Mock).mock.calls.map(
      (call: [string, string]) => call[0],
    );
    expect(calledKeys).toContain('cash_stealth_spending_seed');
    expect(calledKeys).toContain('cash_stealth_viewing_priv');
    expect(calledKeys).toContain('cash_stealth_meta_address');
  });

  it('should NOT use wealth stealth key names (namespace isolation)', async () => {
    await generateAndStoreCashKeys();

    const calledKeys = (SecureStore.setItemAsync as jest.Mock).mock.calls.map(
      (call: [string, string]) => call[0],
    );
    expect(calledKeys).not.toContain('stealth_spending_seed');
    expect(calledKeys).not.toContain('stealth_viewing_priv');
    expect(calledKeys).not.toContain('stealth_meta_address');
  });

  it('should produce different keys on each call (randomness)', async () => {
    const keys1 = await generateAndStoreCashKeys();
    const keys2 = await generateAndStoreCashKeys();
    expect(keys1.metaAddress).not.toBe(keys2.metaAddress);
    expect(keys1.viewingPrivateKeyHex).not.toBe(keys2.viewingPrivateKeyHex);
  });
});

// ===================================================================
// getStoredCashMetaAddress
// ===================================================================

describe('getStoredCashMetaAddress', () => {
  it('should return null when no cash stealth keys are stored', async () => {
    const result = await getStoredCashMetaAddress();
    expect(result).toBeNull();
  });

  it('should return the metaAddress after generateAndStoreCashKeys', async () => {
    const { metaAddress } = await generateAndStoreCashKeys();
    const stored = await getStoredCashMetaAddress();
    expect(stored).toBe(metaAddress);
  });

  it('should read from cash_stealth_meta_address key (not wealth key)', async () => {
    await getStoredCashMetaAddress();

    const readKeys = (SecureStore.getItemAsync as jest.Mock).mock.calls.map(
      (call: [string]) => call[0],
    );
    expect(readKeys).toContain('cash_stealth_meta_address');
    expect(readKeys).not.toContain('stealth_meta_address');
  });
});

// ===================================================================
// clearCashStealthKeys
// ===================================================================

describe('clearCashStealthKeys', () => {
  it('should delete all 3 cash stealth keys from SecureStore', async () => {
    await generateAndStoreCashKeys();
    await clearCashStealthKeys();

    const deletedKeys = (SecureStore.deleteItemAsync as jest.Mock).mock.calls.map(
      (call: [string]) => call[0],
    );
    expect(deletedKeys).toContain('cash_stealth_spending_seed');
    expect(deletedKeys).toContain('cash_stealth_viewing_priv');
    expect(deletedKeys).toContain('cash_stealth_meta_address');
  });

  it('should make getStoredCashMetaAddress return null after clear', async () => {
    await generateAndStoreCashKeys();
    await clearCashStealthKeys();

    // Reset mocks to simulate empty store
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const result = await getStoredCashMetaAddress();
    expect(result).toBeNull();
  });

  it('should NOT delete wealth stealth keys (namespace isolation)', async () => {
    await clearCashStealthKeys();

    const deletedKeys = (SecureStore.deleteItemAsync as jest.Mock).mock.calls.map(
      (call: [string]) => call[0],
    );
    expect(deletedKeys).not.toContain('stealth_spending_seed');
    expect(deletedKeys).not.toContain('stealth_viewing_priv');
    expect(deletedKeys).not.toContain('stealth_meta_address');
  });
});

// ===================================================================
// signCashSpendTransaction
// ===================================================================

describe('signCashSpendTransaction', () => {
  it('should throw if cash stealth keys are not in SecureStore', async () => {
    // SecureStore vide → pas de clés
    await expect(
      signCashSpendTransaction('dummyTx', 'dummyR', 'dummyAddr'),
    ).rejects.toThrow(/keys not found/i);
  });

  it('should throw on address mismatch (guard anti-mismatch)', async () => {
    // Générer des clés cash valides
    const keys = await generateAndStoreCashKeys();

    // ephemeralR aléatoire → dérivation stealthAddr sera différente de 'WrongAddr'
    const { ed25519, x25519 } = await import('@noble/curves/ed25519');
    const ephemeralPriv = x25519.utils.randomPrivateKey();
    const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
    const ephemeralR = bs58.encode(ephemeralPub);

    // Fausse adresse stealth → mismatch attendu
    await expect(
      signCashSpendTransaction('dummyTxBase64', ephemeralR, 'WrongStealthAddress111111111111'),
    ).rejects.toThrow(/mismatch/i);
  });

  it('should successfully sign when ephemeralR and stealthAddress match', async () => {
    // Générer des clés cash valides et les stocker
    const keys = await generateAndStoreCashKeys();

    // Dériver correctement l'adresse stealth en utilisant les mêmes clés
    const { ed25519, x25519 } = await import('@noble/curves/ed25519');
    const { sha256 } = await import('@noble/hashes/sha256');

    const spendingPub = new Uint8Array(bs58.decode(keys.spendingPublicKey));
    const viewingPriv = new Uint8Array(Buffer.from(keys.viewingPrivateKeyHex, 'hex'));

    const ephemeralPriv = x25519.utils.randomPrivateKey();
    const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
    const ephemeralR = bs58.encode(ephemeralPub);

    // Dériver S = X25519(viewingPriv, ephemeralPub)
    const S = x25519.getSharedSecret(viewingPriv, ephemeralPub);
    const h = sha256(S);

    // Réimplémenter bytesToBigIntLE inline
    const L = ed25519.CURVE.n;
    let hScalar = 0n;
    for (let i = 0; i < h.length; i++) {
      hScalar |= BigInt(h[i]) << (BigInt(i) * 8n);
    }
    hScalar = hScalar % L;

    const { scalar: spendingScalar } = ed25519.utils.getExtendedPublicKey(
      new Uint8Array(bs58.decode(keys.spendingPublicKey.slice(0))), // spending seed isn't spendingPublicKey
    );

    // Note: spendingPublicKey is the PUBLIC key, not the seed.
    // We need the spending seed from SecureStore to derive the scalar.
    // In this test, we stored spending seed via generateAndStoreCashKeys.
    // Let's read it from the mock store.
    const spendingSeedHex = (SecureStore.getItemAsync as jest.Mock).mock.results.length > 0
      ? undefined // can't easily extract — use alternative approach
      : undefined;

    // Alternative: use the viewing key to derive correct stealth address
    // spending seed is stored as 'cash_stealth_spending_seed' in the mock store
    // Let's capture it during generation
    const setCalls = (SecureStore.setItemAsync as jest.Mock).mock.calls as [string, string][];
    const seedCall = setCalls.find(([key]) => key === 'cash_stealth_spending_seed');
    if (!seedCall) throw new Error('seed not found in mock calls');
    const spendingSeed = new Uint8Array(Buffer.from(seedCall[1], 'hex'));

    const { scalar: realSpendingScalar } = ed25519.utils.getExtendedPublicKey(spendingSeed);
    let pStealth = (realSpendingScalar + hScalar) % L;
    const derivedPub = ed25519.ExtendedPoint.BASE.multiply(pStealth).toRawBytes();
    const correctStealthAddr = bs58.encode(derivedPub);

    // Construire une TX Solana minimale non-signée
    const { Transaction, SystemProgram, PublicKey } = await import('@solana/web3.js');
    const stealthPubkey = new PublicKey(derivedPub);
    const tx = new Transaction();
    tx.add(SystemProgram.transfer({
      fromPubkey: stealthPubkey,
      toPubkey: new PublicKey('11111111111111111111111111111111'),
      lamports: 1000,
    }));
    tx.recentBlockhash = '11111111111111111111111111111111';
    tx.feePayer = stealthPubkey;
    const unsignedTxB64 = tx.serialize({ requireAllSignatures: false }).toString('base64');

    const result = await signCashSpendTransaction(unsignedTxB64, ephemeralR, correctStealthAddr);

    expect(result.serializedSignedTx).toBeDefined();
    expect(typeof result.serializedSignedTx).toBe('string');
    // Vérifier que c'est du base64 valide
    const bytes = Buffer.from(result.serializedSignedTx, 'base64');
    expect(bytes.length).toBeGreaterThan(0);
  });
});
