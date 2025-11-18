# 🚀 Frontend Integration - Stealf SDK Onboarding

## 📍 Réponses à tes questions

### 1. Où se trouve le SDK Stealf ?

**Chemin SDK :** `/Users/thomasgaugain/Documents/backend-stealf/sdk`

✅ **Confirmé** - C'est le bon chemin !

---

### 2. Que dois-je faire ?

Tu dois :
1. ✅ **Explorer le SDK** pour comprendre son API
2. ✅ **Intégrer le SDK** dans l'app React Native/React
3. ✅ **Remplacer les placeholders "Privacy"** par la vraie fonctionnalité MPC

---

## 🎯 Plan d'Intégration

### Phase 1: Setup (5-10 min)

#### Étape 1.1: Vérifier que le SDK est buildé

```bash
cd /Users/thomasgaugain/Documents/backend-stealf/sdk
npm install
npm run build
```

**Expected:** Dossier `dist/` créé avec les fichiers compilés.

#### Étape 1.2: Créer le lien npm

```bash
# Toujours dans le dossier sdk/
npm link
```

**Expected:** Symlink créé globalement.

#### Étape 1.3: Lier le SDK au frontend

```bash
cd /path/to/your/frontend-app
npm link @stealf/wallet-link-sdk
```

**Expected:** `node_modules/@stealf/wallet-link-sdk` pointe vers le SDK local.

---

### Phase 2: Installer les dépendances (5 min)

Dans ton projet frontend :

```bash
npm install @solana/web3.js@^1.95.8
npm install @coral-xyz/anchor@^0.32.1
npm install @solana/wallet-adapter-react
npm install @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets
```

---

### Phase 3: Configuration (10 min)

#### Étape 3.1: Variables d'environnement

Créer `.env` :

```bash
# Pour React/Vite
REACT_APP_SOLANA_NETWORK=devnet
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com
REACT_APP_PROGRAM_ID=CJGGJceyiZqWszErY1mmkHzbVwsgeYdDe32hHZrfbwmm
REACT_APP_CLUSTER_OFFSET=1100229901

# Pour Next.js (remplacer REACT_APP par NEXT_PUBLIC)
```

#### Étape 3.2: Wrapper Solana Wallet

Créer `src/components/WalletProvider.tsx` :

```typescript
import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

require('@solana/wallet-adapter-react-ui/styles.css');

export const SolanaWalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

Wrapper ton app :

```typescript
// App.tsx
import { SolanaWalletProvider } from './components/WalletProvider';

function App() {
  return (
    <SolanaWalletProvider>
      {/* Ton app */}
    </SolanaWalletProvider>
  );
}
```

---

### Phase 4: Implémentation (30-60 min)

#### 📌 Cas d'usage 1: **Signup** (Création de compte)

L'utilisateur connecte son Grid Smart Account et doit générer un Private Wallet.

**Fichier:** `src/components/AccountCreation.tsx`

```typescript
import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletLinkClient } from '@stealf/wallet-link-sdk';
import { PublicKey, Keypair } from '@solana/web3.js';

export const AccountCreation: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [privateWallet, setPrivateWallet] = useState<Keypair | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleCreateAccount = async () => {
    if (!publicKey || !signTransaction) {
      alert('Connect wallet first');
      return;
    }

    setLoading(true);

    try {
      // 1. Initialize SDK
      const client = await WalletLinkClient.initialize({
        connection,
        programId: new PublicKey(process.env.REACT_APP_PROGRAM_ID!),
        clusterOffset: parseInt(process.env.REACT_APP_CLUSTER_OFFSET!),
        signTransaction,
      });

      // 2. Link Grid Smart Account + Auto-generate Private Wallet
      const result = await client.linkSmartAccountWithPrivateWallet({
        gridWallet: publicKey,
        onComputationQueued: (sig) => setStatus(`TX: ${sig.slice(0, 8)}...`),
        onProgress: (status) => setStatus(status),
      });

      // 3. Save private wallet (IMPORTANT!)
      setPrivateWallet(result.privateWallet);

      // Store securely (localStorage for demo, use encrypted storage in prod)
      localStorage.setItem('stealf_private_wallet', JSON.stringify({
        publicKey: result.privateWallet.publicKey.toBase58(),
        secretKey: Array.from(result.privateWallet.secretKey),
      }));

      setStatus('✅ Success! Private wallet created.');
      alert(`Private Wallet: ${result.privateWallet.publicKey.toBase58()}`);

    } catch (error) {
      console.error(error);
      setStatus('❌ Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Private Wallet</h2>
      {publicKey && (
        <>
          <p>Grid Account: {publicKey.toBase58()}</p>
          <button onClick={handleCreateAccount} disabled={loading}>
            {loading ? 'Creating...' : 'Create Private Wallet'}
          </button>
          {status && <p>{status}</p>}
        </>
      )}
    </div>
  );
};
```

---

#### 📌 Cas d'usage 2: **Login** (Récupération des wallets)

L'utilisateur connecte son Grid Smart Account et récupère son Private Wallet lié.

**Fichier:** `src/components/Login.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletLinkClient } from '@stealf/wallet-link-sdk';
import { PublicKey } from '@solana/web3.js';

export const Login: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const [wallets, setWallets] = useState<{ grid: PublicKey; private: PublicKey } | null>(null);
  const [status, setStatus] = useState<string>('');

  // Check if user has linked wallets
  useEffect(() => {
    const checkLinkedWallets = async () => {
      if (!publicKey || !signTransaction) return;

      try {
        const client = await WalletLinkClient.initialize({
          connection,
          programId: new PublicKey(process.env.REACT_APP_PROGRAM_ID!),
          clusterOffset: parseInt(process.env.REACT_APP_CLUSTER_OFFSET!),
          signTransaction,
        });

        const hasWallets = await client.hasLinkedWallets(publicKey);
        setHasLinkedWallet(hasWallets);
      } catch (error) {
        console.error(error);
      }
    };

    checkLinkedWallets();
  }, [publicKey, connection, signTransaction]);

  const handleLogin = async () => {
    if (!publicKey || !signTransaction) return;

    setLoading(true);

    try {
      // 1. Initialize SDK
      const client = await WalletLinkClient.initialize({
        connection,
        programId: new PublicKey(process.env.REACT_APP_PROGRAM_ID!),
        clusterOffset: parseInt(process.env.REACT_APP_CLUSTER_OFFSET!),
        signTransaction,
      });

      // 2. Retrieve linked wallets via MPC
      const result = await client.retrieveLinkedWallets({
        gridWallet: publicKey,
        onComputationQueued: (sig) => setStatus(`MPC queued: ${sig.slice(0, 8)}...`),
        onProgress: (status) => setStatus(status),
      });

      setWallets({
        grid: result.gridWallet,
        private: result.privateWallet,
      });

      setStatus('✅ Logged in successfully!');

    } catch (error) {
      console.error(error);
      setStatus('❌ Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {publicKey && (
        <>
          <p>Grid Account: {publicKey.toBase58()}</p>
          {hasLinkedWallet ? (
            <p>✅ Linked wallet detected</p>
          ) : (
            <p>⚠️ No linked wallet found</p>
          )}

          <button onClick={handleLogin} disabled={loading || !hasLinkedWallet}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {status && <p>{status}</p>}

          {wallets && (
            <div>
              <h3>Your Wallets:</h3>
              <p>Grid: {wallets.grid.toBase58()}</p>
              <p>Private: {wallets.private.toBase58()}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

---

### Phase 5: Remplacer les placeholders "Privacy"

Dans ton UI actuelle, remplace les écrans "Privacy" par :

```typescript
// Exemple d'intégration dans ton routing
import { AccountCreation } from './components/AccountCreation';
import { Login } from './components/Login';

// Dans ton router/navigation
<Route path="/signup" element={<AccountCreation />} />
<Route path="/login" element={<Login />} />

// Ou dans un screen existant
function PrivacyScreen() {
  const [mode, setMode] = useState<'signup' | 'login'>('login');

  return (
    <div>
      <button onClick={() => setMode('login')}>Login</button>
      <button onClick={() => setMode('signup')}>Sign Up</button>

      {mode === 'signup' ? <AccountCreation /> : <Login />}
    </div>
  );
}
```

---

## 📚 API du SDK - Référence Rapide

### Import

```typescript
import { WalletLinkClient } from '@stealf/wallet-link-sdk';
```

### Initialize Client

```typescript
const client = await WalletLinkClient.initialize({
  connection,              // Solana connection
  programId,              // PublicKey du programme
  clusterOffset,          // Offset MPC cluster
  signTransaction,        // Fonction de signature du wallet
});
```

### Méthodes Principales

#### 1. `linkSmartAccountWithPrivateWallet(options)`

**Quand l'utiliser :** Signup (première connexion)

**Ce qu'elle fait :**
- Génère automatiquement un nouveau Private Wallet
- Chiffre le lien Grid ↔ Private avec MPC
- Stocke on-chain dans un PDA
- Retourne le Keypair complet (avec clé privée)

```typescript
const result = await client.linkSmartAccountWithPrivateWallet({
  gridWallet: publicKey,
  onComputationQueued: (sig) => console.log('TX:', sig),
  onProgress: (status) => console.log(status),
});

// result.privateWallet = Keypair (full keypair with secret key)
```

#### 2. `retrieveLinkedWallets(options)`

**Quand l'utiliser :** Login (utilisateur existant)

**Ce qu'elle fait :**
- Déclenche le MPC pour déchiffrer le lien
- Attend l'event listener
- Retourne les PublicKeys (Grid + Private)

```typescript
const result = await client.retrieveLinkedWallets({
  gridWallet: publicKey,
  onComputationQueued: (sig) => console.log('MPC:', sig),
  onProgress: (status) => console.log(status),
});

// result.gridWallet = PublicKey
// result.privateWallet = PublicKey (public key only)
```

#### 3. `hasLinkedWallets(gridWallet)`

**Quand l'utiliser :** Vérifier si l'utilisateur a déjà un compte

```typescript
const hasWallets: boolean = await client.hasLinkedWallets(publicKey);

if (hasWallets) {
  // Show login flow
} else {
  // Show signup flow
}
```

---

## 🔐 Sécurité - À Savoir

### Stockage du Private Wallet

**⚠️ IMPORTANT:**

Lors du signup, tu reçois le **Keypair complet** (avec clé privée).

**Tu DOIS le stocker de manière sécurisée :**

```typescript
// ❌ PAS BON (localStorage en clair)
localStorage.setItem('wallet', JSON.stringify(keypair));

// ✅ BON (chiffré ou sécurisé)
// Option 1: Encrypted storage (React Native)
import EncryptedStorage from 'react-native-encrypted-storage';
await EncryptedStorage.setItem('stealf_wallet', JSON.stringify({
  secretKey: Array.from(keypair.secretKey),
}));

// Option 2: Keychain (iOS/Android)
import * as Keychain from 'react-native-keychain';
await Keychain.setGenericPassword('stealf', JSON.stringify(keypair.secretKey));
```

### Lors du Login

Tu récupères uniquement les **PublicKeys**. Pour récupérer la clé privée complète :

```typescript
// Charger depuis le storage sécurisé
const stored = await EncryptedStorage.getItem('stealf_wallet');
const { secretKey } = JSON.parse(stored);
const privateWallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
```

---

## 🐛 Troubleshooting

### Erreur: "Module not found @stealf/wallet-link-sdk"

**Solution:**
```bash
cd /Users/thomasgaugain/Documents/backend-stealf/sdk
npm link

cd /path/to/frontend
npm link @stealf/wallet-link-sdk
```

### Erreur: "MPC computation timeout"

**Cause:** Le cluster MPC devnet peut être lent.

**Solution:**
- La transaction on-chain réussit quand même
- Le MPC est juste mis en queue
- Réessayer plus tard si besoin

### Erreur TypeScript

**Solution:** Rebuild le SDK
```bash
cd /Users/thomasgaugain/Documents/backend-stealf/sdk
npm run build
```

---

## 📖 Documentation Complète

- **Guide d'intégration frontend:** [sdk/FRONTEND_INTEGRATION.md](sdk/FRONTEND_INTEGRATION.md)
- **API Documentation:** [sdk/README.md](sdk/README.md)
- **Exemples d'utilisation:** [sdk/USAGE_EXAMPLE.md](sdk/USAGE_EXAMPLE.md)
- **Détails techniques:** [sdk/IMPLEMENTATION_SUMMARY.md](sdk/IMPLEMENTATION_SUMMARY.md)

---

## ✅ Checklist d'Intégration

- [ ] SDK buildé (`npm run build`)
- [ ] npm link configuré
- [ ] Dépendances installées dans le frontend
- [ ] Variables d'environnement configurées
- [ ] Wallet Provider configuré
- [ ] Composant Signup implémenté
- [ ] Composant Login implémenté
- [ ] Stockage sécurisé du private wallet
- [ ] Tests sur devnet

---

## 🚀 Prochaines Étapes

1. **Setup SDK** (Phase 1)
2. **Installer dépendances** (Phase 2)
3. **Configuration** (Phase 3)
4. **Implémenter Signup + Login** (Phase 4)
5. **Remplacer placeholders** (Phase 5)
6. **Tester sur devnet**

---

**Besoin d'aide ?** Check la documentation complète ou pose tes questions !

**Dernière mise à jour:** 2024-11-17
