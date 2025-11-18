# 🔗 Guide d'Intégration Stealf SDK

Ce document explique comment intégrer le Stealf SDK (Private Wallet + MPC) dans votre application React Native.

---

## 📦 Ce qui a été fait

### ✅ SDK Adapté pour React Native
- Remplacement de `crypto` Node.js par `expo-crypto`
- Remplacement de tous les `Buffer` par `Uint8Array`
- Fonctions transformées en `async` pour compatibilité
- Build réussi sans erreurs

### ✅ Configuration Frontend
- Polyfills ajoutés dans `App.tsx`
- Metro bundler configuré pour résoudre les modules Node.js
- Dépendances installées : `buffer`, `readable-stream`, `@stealf/wallet-link-sdk`

### ✅ Services Créés
- **`stealfService.ts`** - Service singleton pour gérer le SDK
- **`useStealf.ts`** - Hook React pour utilisation facile

---

## 🚀 Utilisation

### 1. Au Signup (Création de Compte)

Lors de la création d'un compte Grid, créez et liez automatiquement un Private Wallet :

```typescript
// Dans src/hooks/auth/useRegister.ts
import { useStealf } from '../useStealf';

export function useRegister() {
  const { linkWallet, isLoading: isLinkingWallet } = useStealf();

  const register = async (email: string, otp: string) => {
    try {
      // 1. Créer le compte Grid (code existant)
      const authData = await gridClient.createAccount({
        type: 'email',
        email: email,
      });

      const gridAddress = authData.address; // Adresse du Grid Smart Account

      // 2. Créer et lier le Private Wallet automatiquement
      console.log('🔗 Linking Private Wallet...');
      const { privateWallet } = await linkWallet(gridAddress);

      console.log('✅ Private Wallet created:', privateWallet.publicKey.toBase58());

      // 3. Sauvegarder les données (déjà fait automatiquement par le service)
      // La clé privée est stockée de manière sécurisée dans SecureStore

      return {
        gridAddress,
        privateWalletAddress: privateWallet.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  return {
    register,
    isLoading: isLinkingWallet,
  };
}
```

### 2. Au Login (Récupération)

Lors du login, récupérez les wallets liés :

```typescript
// Dans src/hooks/auth/useLogin.ts
import { useStealf } from '../useStealf';

export function useLogin() {
  const { retrieveWallets, checkHasLinkedWallets } = useStealf();

  const login = async (email: string, otp: string) => {
    try {
      // 1. Authentifier avec Grid (code existant)
      await gridClient.initAuth({ email });
      await gridClient.completeAuth(otp);

      const gridAddress = await gridClient.getAddress();

      // 2. Vérifier si l'utilisateur a des wallets liés
      const hasWallets = await checkHasLinkedWallets(gridAddress);

      if (hasWallets) {
        // 3. Récupérer les wallets liés via MPC
        console.log('🔍 Retrieving Private Wallet...');
        const wallets = await retrieveWallets(gridAddress);

        console.log('✅ Grid Wallet:', wallets.gridWallet.toBase58());
        console.log('✅ Private Wallet:', wallets.privateWallet.toBase58());

        return {
          gridAddress: wallets.gridWallet.toBase58(),
          privateWalletAddress: wallets.privateWallet.toBase58(),
        };
      } else {
        console.log('⚠️ No linked wallets found');
        return {
          gridAddress,
          privateWalletAddress: null,
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  return { login };
}
```

### 3. Utiliser le Private Wallet pour les Transactions

Pour envoyer une transaction privée :

```typescript
// Dans src/hooks/useSendPrivateTransaction.ts
import { useStealf } from './useStealf';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

export function useSendPrivateTransaction() {
  const { getPrivateWalletKeypair } = useStealf();

  const sendPrivateTransaction = async (
    recipientAddress: string,
    amount: number
  ) => {
    try {
      // 1. Récupérer le Keypair du Private Wallet
      const privateWalletKeypair = await getPrivateWalletKeypair();

      if (!privateWalletKeypair) {
        throw new Error('Private wallet not found');
      }

      console.log('💸 Sending from Private Wallet:', privateWalletKeypair.publicKey.toBase58());

      // 2. Créer la transaction
      const connection = new Connection('https://api.devnet.solana.com');
      const recipientPubkey = new PublicKey(recipientAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: privateWalletKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports: amount * 1e9, // Convertir en lamports
        })
      );

      // 3. Signer avec la clé privée
      transaction.feePayer = privateWalletKeypair.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      transaction.sign(privateWalletKeypair);

      // 4. Envoyer la transaction
      const signature = await connection.sendRawTransaction(
        transaction.serialize()
      );

      console.log('✅ Transaction sent:', signature);

      // 5. Confirmer la transaction
      await connection.confirmTransaction(signature);

      return signature;
    } catch (error) {
      console.error('❌ Transaction error:', error);
      throw error;
    }
  };

  return { sendPrivateTransaction };
}
```

### 4. Au Logout

Nettoyer les données du Private Wallet :

```typescript
// Dans src/contexts/AuthContext.tsx
import stealfService from '../services/stealfService';

const logout = async () => {
  try {
    // 1. Nettoyer les données Grid (code existant)
    await authStorage.clearAll();

    // 2. Nettoyer les données Stealf
    await stealfService.clearPrivateWalletData();

    setUser(null);
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## ⚠️ Points d'Attention

### 1. Grid SDK Signature

Le service Stealf utilise Grid SDK pour signer les transactions. Assurez-vous que Grid SDK expose une méthode `sign()` :

```typescript
// Vérifier si cette méthode existe dans Grid SDK
const signedTx = await gridClient.sign(transaction);
```

Si Grid SDK n'a pas cette méthode, il faudra adapter le wrapper wallet dans `stealfService.ts`.

### 2. @arcium-hq/client Compatibility

Le package `@arcium-hq/client` utilisé par le SDK Stealf n'a pas été testé en React Native.

**Premiers tests à faire :**
1. Lancer l'app et vérifier qu'il n'y a pas d'erreur d'import
2. Essayer de créer un lien wallet (au signup)
3. Si erreur, identifier quel module pose problème

**Si ça ne fonctionne pas :**
- Option A : Contacter Arcium pour support React Native
- Option B : Créer une API backend qui utilise le SDK en Node.js

### 3. Environment

Dans `stealfService.ts`, changez l'environnement pour production :

```typescript
environment: 'mainnet', // Au lieu de 'devnet'
```

### 4. Gestion des Erreurs

Le SDK peut échouer pour plusieurs raisons :
- Pas de connexion réseau
- MPC computation timeout
- Wallets déjà liés
- Wallets non trouvés

Implémentez une gestion d'erreur robuste :

```typescript
try {
  await linkWallet(gridAddress);
} catch (error) {
  if (error.message.includes('already linked')) {
    // Wallets déjà liés, récupérer au lieu de créer
    await retrieveWallets(gridAddress);
  } else {
    // Autre erreur
    Alert.alert('Error', error.message);
  }
}
```

---

## 🧪 Tests à Effectuer

### Test 1 : Import du SDK

Ajoutez temporairement dans `App.tsx` après les imports :

```typescript
import { WalletLinkClient } from '@stealf/wallet-link-sdk';
console.log('✅ SDK imported:', WalletLinkClient);
```

Lancez l'app et vérifiez qu'il n'y a pas d'erreur.

### Test 2 : Signup Complet

1. Créer un nouveau compte
2. Vérifier dans les logs que le Private Wallet est créé
3. Vérifier que la clé est sauvegardée dans SecureStore

### Test 3 : Login Complet

1. Se déconnecter
2. Se reconnecter avec le même compte
3. Vérifier que le Private Wallet est récupéré

### Test 4 : Transaction Privée

1. Envoyer une transaction depuis le Private Wallet
2. Vérifier qu'elle est confirmée sur Solana Explorer

---

## 📁 Fichiers Créés

1. **`src/services/stealfService.ts`** - Service principal pour gérer le SDK
2. **`src/hooks/useStealf.ts`** - Hook React pour utilisation facile
3. **Ce fichier** - Documentation et exemples d'intégration

---

## 🔄 Workflow Complet

```
┌─────────────────────────────────────────────────────────────┐
│                        SIGNUP                                │
└─────────────────────────────────────────────────────────────┘
User → Email + OTP → Grid Account Created
                  ↓
            Grid Smart Account (Public)
                  ↓
       Stealf SDK: linkWallet()
                  ↓
         MPC Creates Private Wallet
                  ↓
       Encrypted Link Stored On-Chain
                  ↓
      Private Key Saved in SecureStore

┌─────────────────────────────────────────────────────────────┐
│                        LOGIN                                 │
└─────────────────────────────────────────────────────────────┘
User → Email + OTP → Grid Session Created
                  ↓
       Stealf SDK: retrieveWallets()
                  ↓
         MPC Re-encrypts Link
                  ↓
       Private Wallet Address Retrieved
                  ↓
    Private Key Already in SecureStore

┌─────────────────────────────────────────────────────────────┐
│                   PRIVATE TRANSACTION                        │
└─────────────────────────────────────────────────────────────┘
User → Amount + Recipient
                  ↓
      Load Private Keypair from SecureStore
                  ↓
         Create & Sign Transaction
                  ↓
       Send to Solana (from Private Wallet)
                  ↓
            Transaction Confirmed
```

---

## 🆘 Dépannage

### Erreur : "Module not found: expo-crypto"

**Solution :** Vérifier que `expo-crypto` est bien installé
```bash
npx expo install expo-crypto
```

### Erreur : "Buffer is not defined"

**Solution :** Vérifier que les polyfills sont bien en premier dans `App.tsx`

### Erreur : "@arcium-hq/client" incompatible

**Solution :** Utiliser une approche backend (API Node.js)

### Erreur : "Grid SDK sign() method not found"

**Solution :** Adapter le wrapper wallet dans `stealfService.ts` pour utiliser la vraie API Grid SDK

---

**Prochaine étape :** Testez l'import du SDK en lançant votre app !
