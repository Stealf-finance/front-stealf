# Intégration React Native (Expo) — encrypted_link

Guide pour intégrer le programme Solana/Arcium `encrypted_link` dans une app React Native avec Expo.

**Programme ID (devnet):** `CRE9bxRgXenibicSpTDBZ3RdbhSDwbRchzYaHzjGMbLg`

---

## Table des matières

1. [Prérequis & Dépendances](#1-prérequis--dépendances)
2. [Setup — Connexion Solana & Programme](#2-setup--connexion-solana--programme)
3. [Helpers Crypto](#3-helpers-crypto)
4. [Flow 1: init_salt (admin, one-time)](#4-flow-1--init_salt-admin-one-time)
5. [Flow 2: store_wallet (signup)](#5-flow-2--store_wallet-signup)
6. [Flow 3: verify_wallet (signin)](#6-flow-3--verify_wallet-signin)
7. [Stockage côté client](#7-stockage-côté-client)
8. [Notes devnet](#8-notes-devnet)

---

## 1. Prérequis & Dépendances

### Packages Solana / Anchor / Arcium

```bash
npx expo install \
  @solana/web3.js@1.95.8 \
  @coral-xyz/anchor \
  @arcium-hq/client
```

> **Important:** Pin `@solana/web3.js` à `1.95.8` — les versions plus récentes cassent l'API `SendTransactionError` d'Anchor 0.32.

### Polyfills crypto pour React Native

React Native n'a pas `crypto.getRandomValues`, `Buffer`, ni `TextEncoder` en natif. Il faut les polyfill **avant** tout import Solana.

```bash
npx expo install \
  react-native-get-random-values \
  buffer \
  text-encoding-polyfill \
  react-native-url-polyfill
```

Crée un fichier `polyfills.ts` importé **en tout premier** dans ton `App.tsx` :

```typescript
// polyfills.ts — DOIT être importé avant tout autre code
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

if (typeof global.TextEncoder === 'undefined') {
  require('text-encoding-polyfill');
}
```

```typescript
// App.tsx
import './polyfills'; // <-- première ligne !
import { ... } from 'expo-router';
// ...
```

### Wallet adapter (optionnel)

Pour connecter un wallet externe (Phantom, Solflare) :

```bash
npx expo install \
  @solana-mobile/mobile-wallet-adapter-protocol \
  @solana-mobile/mobile-wallet-adapter-protocol-web3js
```

Si tu gères le wallet côté serveur ou en local (Keypair), tu n'as pas besoin de wallet adapter.

---

## 2. Setup — Connexion Solana & Programme

### Connexion RPC

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  getArciumProgram,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
} from '@arcium-hq/client';

const PROGRAM_ID = new PublicKey('CRE9bxRgXenibicSpTDBZ3RdbhSDwbRchzYaHzjGMbLg');
const CLUSTER_OFFSET = 456;
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY';

const connection = new Connection(RPC_URL, 'confirmed');
```

### Instanciation du programme avec l'IDL

Copie le fichier `target/idl/encrypted_link.json` dans ton projet React Native (par ex. `src/idl/encrypted_link.json`).

```typescript
import idl from '../idl/encrypted_link.json';

// Avec un wallet signeur (Keypair local ou wallet adapter)
const provider = new AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});
const program = new Program(idl as any, provider);
const arciumProgram = getArciumProgram(provider);
```

### Dériver les comptes Arcium (constantes)

```typescript
const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);
const mxeAccount = getMXEAccAddress(PROGRAM_ID);

// Salt PDA
const [saltPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('salt')],
  PROGRAM_ID,
);
```

---

## 3. Helpers Crypto

Le programme utilise le chiffrement x25519 + RescueCipher d'Arcium. Voici les helpers nécessaires, adaptés des tests.

### Imports Arcium crypto

```typescript
import {
  x25519,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  awaitComputationFinalization,
} from '@arcium-hq/client';
```

### Random bytes (React Native)

```typescript
// Utilise le polyfill react-native-get-random-values
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
```

### splitPubkeyToU128s

Découpe une clé publique Solana (32 bytes) en deux `u128` little-endian pour le circuit Arcium.

```typescript
function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  const lo = deserializeLE(pubkey.slice(0, 16));
  const hi = deserializeLE(pubkey.slice(16, 32));
  return { lo, hi };
}
```

### Créer un cipher partagé avec le MXE

Pattern réutilisé dans chaque flow : générer une paire x25519 éphémère, dériver le secret partagé, créer un cipher.

```typescript
async function createSharedCipher(provider: AnchorProvider) {
  // 1. Récupérer la clé publique x25519 du MXE
  const mxePublicKey = await getMXEPublicKey(provider, PROGRAM_ID);

  // 2. Générer une paire éphémère x25519
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);

  // 3. Dériver le secret partagé + créer le cipher
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  return { cipher, publicKey, mxePublicKey };
}
```

> **Retry MXE key:** En production, ajoute un retry loop (voir `getMXEPublicKeyWithRetry` dans les tests) car la clé MXE peut mettre quelques secondes à être disponible après un redéploiement.

### Event listener

```typescript
type Event = anchor.IdlEvents<typeof program['idl']>;

function awaitEvent<E extends keyof Event>(eventName: E): Promise<Event[E]> {
  let listenerId: number;
  const event = new Promise<Event[E]>((resolve) => {
    listenerId = program.addEventListener(eventName, (event) => {
      resolve(event);
    });
  });
  return event.then(async (e) => {
    await program.removeEventListener(listenerId!);
    return e;
  });
}
```

---

## 4. Flow 1 — init_salt (admin, one-time)

> **Sur devnet, c'est déjà fait.** Le salt est initialisé une seule fois par l'admin. Les utilisateurs n'appellent jamais cette instruction. Skip cette section sauf si tu redéploies le programme.

Ce flow :
1. Génère un salt random (32 bytes)
2. Le chiffre avec x25519 + RescueCipher
3. Envoie au circuit MPC qui le stocke chiffré on-chain (`SaltAccount`)

```typescript
async function initSalt(program, provider) {
  const { cipher, publicKey } = await createSharedCipher(provider);

  // Générer un salt random
  const salt = randomBytes(32);
  const saltLo = deserializeLE(salt.slice(0, 16));
  const saltHi = deserializeLE(salt.slice(16, 32));

  // Chiffrer
  const nonce = randomBytes(16);
  const ciphertext = cipher.encrypt([saltLo, saltHi], nonce);

  // Écouter l'event avant d'envoyer la tx
  const eventPromise = awaitEvent('saltInitialized');

  const computationOffset = new BN(randomBytes(8), 'hex');

  await program.methods
    .initSalt(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(ciphertext[1]),
      Array.from(publicKey),
      new BN(deserializeLE(nonce).toString()),
    )
    .accountsPartial({
      saltAccount: saltPDA,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount,
      mxeAccount,
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        PROGRAM_ID,
        Buffer.from(getCompDefAccOffset('init_salt')).readUInt32LE(),
      ),
    })
    .rpc({ commitment: 'confirmed' });

  // Attendre la finalisation MPC
  await awaitComputationFinalization(provider, computationOffset, PROGRAM_ID, 'confirmed');
  await eventPromise;

  console.log('Salt initialisé !');
}
```

---

## 5. Flow 2 — store_wallet (signup)

C'est le **flow principal côté utilisateur**. Il :
1. Prend le wallet public key de l'utilisateur
2. Le chiffre avec x25519
3. L'envoie au circuit MPC qui calcule `SHA3_256(wallet || salt)` = commitment
4. Retourne le commitment chiffré via l'event `WalletStored`
5. Le client déchiffre et stocke le commitment localement

```typescript
async function storeWallet(
  program: Program,
  provider: AnchorProvider,
  walletPubkey: PublicKey,
): Promise<{ commitmentLo: bigint; commitmentHi: bigint }> {
  const { cipher, publicKey } = await createSharedCipher(provider);

  // Découper le wallet en 2x u128
  const { lo: walletLo, hi: walletHi } = splitPubkeyToU128s(walletPubkey.toBytes());

  // Chiffrer
  const nonce = randomBytes(16);
  const ciphertext = cipher.encrypt([walletLo, walletHi], nonce);

  // Écouter l'event AVANT d'envoyer la tx
  const eventPromise = awaitEvent('walletStored');

  const computationOffset = new BN(randomBytes(8), 'hex');

  await program.methods
    .storeWallet(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(ciphertext[1]),
      Array.from(publicKey),
      new BN(deserializeLE(nonce).toString()),
    )
    .accountsPartial({
      saltAccount: saltPDA,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount,
      mxeAccount,
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        PROGRAM_ID,
        Buffer.from(getCompDefAccOffset('store_wallet')).readUInt32LE(),
      ),
    })
    .rpc({ commitment: 'confirmed' });

  // Attendre la finalisation MPC
  await awaitComputationFinalization(provider, computationOffset, PROGRAM_ID, 'confirmed');

  // Récupérer et déchiffrer le commitment depuis l'event
  const event = await eventPromise;
  const decrypted = cipher.decrypt(
    [event.commitmentLo, event.commitmentHi],
    event.nonce,
  );

  const commitmentLo = decrypted[0];
  const commitmentHi = decrypted[1];

  console.log('Commitment reçu:', commitmentLo.toString(16), commitmentHi.toString(16));

  // ⚠️ STOCKER commitmentLo et commitmentHi côté client (voir section 7)
  return { commitmentLo, commitmentHi };
}
```

### Usage

```typescript
const wallet = /* PublicKey de l'utilisateur */;
const { commitmentLo, commitmentHi } = await storeWallet(program, provider, wallet);

// Stocker le commitment (voir section 7)
await saveCommitment(commitmentLo, commitmentHi);
```

---

## 6. Flow 3 — verify_wallet (signin)

Vérifie que le wallet de l'utilisateur correspond au commitment stocké. Le circuit MPC recalcule le hash et compare.

1. Envoie le wallet + commitment chiffrés
2. Le circuit retourne `1` (match) ou `0` (no match) chiffré
3. Le client déchiffre le résultat

```typescript
async function verifyWallet(
  program: Program,
  provider: AnchorProvider,
  walletPubkey: PublicKey,
  commitmentLo: bigint,
  commitmentHi: bigint,
): Promise<boolean> {
  const { cipher, publicKey } = await createSharedCipher(provider);

  const { lo, hi } = splitPubkeyToU128s(walletPubkey.toBytes());

  // Chiffrer wallet + commitment (4 valeurs u128)
  const nonce = randomBytes(16);
  const ciphertext = cipher.encrypt([lo, hi, commitmentLo, commitmentHi], nonce);

  // Écouter l'event
  const eventPromise = awaitEvent('walletVerified');

  const computationOffset = new BN(randomBytes(8), 'hex');

  await program.methods
    .verifyWallet(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(ciphertext[1]),
      Array.from(ciphertext[2]),
      Array.from(ciphertext[3]),
      Array.from(publicKey),
      new BN(deserializeLE(nonce).toString()),
    )
    .accountsPartial({
      saltAccount: saltPDA,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount,
      mxeAccount,
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        PROGRAM_ID,
        Buffer.from(getCompDefAccOffset('verify_wallet')).readUInt32LE(),
      ),
    })
    .rpc({ commitment: 'confirmed' });

  // Attendre la finalisation MPC
  await awaitComputationFinalization(provider, computationOffset, PROGRAM_ID, 'confirmed');

  // Déchiffrer le résultat
  const event = await eventPromise;
  const result = cipher.decrypt([event.result], event.nonce)[0];

  const isMatch = Number(result) === 1;
  console.log('Vérification:', isMatch ? 'MATCH' : 'NO MATCH');

  return isMatch;
}
```

### Usage

```typescript
const { commitmentLo, commitmentHi } = await loadCommitment();

const isVerified = await verifyWallet(
  program,
  provider,
  userWallet,
  commitmentLo,
  commitmentHi,
);

if (isVerified) {
  // Authentification réussie -> naviguer vers le dashboard
} else {
  // Wallet incorrect
}
```

---

## 7. Stockage côté client

Le commitment (`commitmentLo` + `commitmentHi`) est le seul secret côté client. Il doit être stocké de manière sécurisée.

### expo-secure-store

```bash
npx expo install expo-secure-store
```

```typescript
import * as SecureStore from 'expo-secure-store';

async function saveCommitment(lo: bigint, hi: bigint): Promise<void> {
  await SecureStore.setItemAsync('commitment_lo', lo.toString());
  await SecureStore.setItemAsync('commitment_hi', hi.toString());
}

async function loadCommitment(): Promise<{ commitmentLo: bigint; commitmentHi: bigint }> {
  const lo = await SecureStore.getItemAsync('commitment_lo');
  const hi = await SecureStore.getItemAsync('commitment_hi');

  if (!lo || !hi) {
    throw new Error('Aucun commitment trouvé — signup requis');
  }

  return {
    commitmentLo: BigInt(lo),
    commitmentHi: BigInt(hi),
  };
}

async function hasCommitment(): Promise<boolean> {
  const lo = await SecureStore.getItemAsync('commitment_lo');
  return lo !== null;
}

async function clearCommitment(): Promise<void> {
  await SecureStore.deleteItemAsync('commitment_lo');
  await SecureStore.deleteItemAsync('commitment_hi');
}
```

> **Limite:** `expo-secure-store` a une limite de 2048 bytes par valeur. Un `bigint` en string rentre largement.

### Flow app typique

```
1. App démarre
2. hasCommitment() ?
   ├─ NON  → écran signup → storeWallet() → saveCommitment()
   └─ OUI  → loadCommitment() → verifyWallet()
              ├─ true  → dashboard
              └─ false → "Wallet incorrect" / re-signup
```

---

## 8. Notes devnet

| Paramètre | Valeur |
|-----------|--------|
| Program ID | `CRE9bxRgXenibicSpTDBZ3RdbhSDwbRchzYaHzjGMbLg` |
| Cluster | Solana Devnet |
| Cluster offset | `456` |
| RPC | `https://devnet.helius-rpc.com/?api-key=YOUR_KEY` |
| Arcium program | `Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ` |
| Salt | Déjà initialisé (PDA `["salt"]`) |
| Comp defs | Déjà créées (init_salt, store_wallet, verify_wallet) |
| IDL | `target/idl/encrypted_link.json` |
| @arcium-hq/client | `0.8.3` |
| @coral-xyz/anchor | `0.32.1` |
| @solana/web3.js | `1.95.8` (pinned) |

### Temps de réponse MPC

Les computations MPC sur devnet prennent **10-60 secondes** selon la charge. Prévois un loader/spinner dans l'UI et un timeout généreux.

### Coûts

Chaque computation nécessite du SOL pour les frais de transaction + frais Arcium. Sur devnet, utilise `solana airdrop` pour obtenir du SOL de test.

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `ComputationDefinitionNotCompleted (6300)` | Comp def mal initialisée | Redéployer le programme |
| `SaltNotInitialized (6002)` | Salt PDA pas encore créé | Appeler `init_salt` d'abord |
| `AbortedComputation (6000)` | MPC a échoué | Retry la computation |
| `Unknown action 'undefined'` | Incompatibilité web3.js/Anchor | Pin `@solana/web3.js@1.95.8` |
