# Guide des Transactions - Frontend GRID SDK

Guide complet pour implémenter les transactions avec le backend GRID.

---

## 📦 Installation

```bash
npm install @sqds/grid @sqds/grid/native
```

---

## 🔄 Flux Complet d'une Transaction

Une transaction GRID se fait en **3 étapes** :

1. **Créer l'intention de paiement** (backend)
2. **Signer la transaction** (frontend avec SDK GRID)
3. **Confirmer et envoyer** (backend)

---

## 1️⃣ Créer l'Intention de Paiement

### Endpoint

```
POST http://localhost:3001/grid/payment-intent
```

### Headers

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
}
```

### Body

```typescript
{
  smartAccountAddress: string,    // Adresse du compte source
  payload: {
    amount: string,                // Montant en microUSDC (ex: "1000000" = 1 USDC)
    grid_user_id: string,          // ID utilisateur GRID
    source: {
      account: string,             // Adresse du compte source
      currency: "usdc"             // Toujours "usdc"
    },
    destination: {
      address: string,             // Adresse du destinataire
      currency: "usdc"             // Toujours "usdc"
    }
  },
  useMpcProvider: boolean          // true pour utiliser MPC
}
```

### Exemple de Code

```typescript
async function createPaymentIntent(
  recipientAddress: string,
  amount: number, // en USDC décimal (ex: 10.5)
  userAddress: string,
  gridUserId: string
) {
  const accessToken = await SecureStore.getItemAsync('access_token');

  const response = await fetch('http://localhost:3001/grid/payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      smartAccountAddress: userAddress,
      payload: {
        amount: (amount * 1_000_000).toString(), // ⚠️ Convertir en microUSDC
        grid_user_id: gridUserId,
        source: {
          account: userAddress,
          currency: "usdc"
        },
        destination: {
          address: recipientAddress,
          currency: "usdc"
        }
      },
      useMpcProvider: true
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  const data = await response.json();
  return data;
}
```

### Réponse

```json
{
  "data": {
    "transactionPayload": "base64_encoded_unsigned_transaction"
  }
}
```

---

## 2️⃣ Signer la Transaction (Frontend)

### Prérequis

Vous devez avoir :
- Les `sessionSecrets` (sauvegardés lors de l'authentification)
- L'objet `user.authentication` (retourné lors de l'authentification)
- Le `transactionPayload` (retourné par l'étape 1)

### Code de Signature

```typescript
import { SDKGridClient } from '@sqds/grid/native';

async function signTransaction(transactionPayload: string) {
  // Récupérer les données sauvegardées
  const sessionSecretsStr = await SecureStore.getItemAsync('session_secrets');
  const sessionSecrets = JSON.parse(sessionSecretsStr!);

  const userDataStr = await SecureStore.getItemAsync('user_data');
  const userData = JSON.parse(userDataStr!);

  // Initialiser le client GRID
  const gridClient = new SDKGridClient({
    environment: 'production', // ou 'sandbox'
    baseUrl: 'https://grid.squads.xyz'
  });

  // Signer la transaction
  const signedPayload = await gridClient.sign({
    sessionSecrets: sessionSecrets,
    session: userData.authentication,
    transactionPayload: transactionPayload
  });

  return signedPayload;
}
```

---

## 3️⃣ Confirmer et Envoyer la Transaction

### Endpoint

```
POST http://localhost:3001/grid/confirm
```

### Headers

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
}
```

### Body

```typescript
{
  address: string,                    // Adresse du compte source
  signedTransactionPayload: string    // Transaction signée (étape 2)
}
```

### Code de Confirmation

```typescript
async function confirmTransaction(
  userAddress: string,
  signedTransactionPayload: string
) {
  const accessToken = await SecureStore.getItemAsync('access_token');

  const response = await fetch('http://localhost:3001/grid/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      address: userAddress,
      signedTransactionPayload: signedTransactionPayload
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Transaction failed');
  }

  const signature = await response.json();
  return signature;
}
```

### Réponse

```json
{
  "signature": "5J7XqG..."
}
```

---

## 🎯 Fonction Complète

Voici une fonction qui combine les 3 étapes :

```typescript
import { SDKGridClient } from '@sqds/grid/native';
import * as SecureStore from 'expo-secure-store';

interface TransactionParams {
  recipientAddress: string;
  amount: number;           // en USDC (ex: 10.5)
  userAddress: string;
  gridUserId: string;
}

async function sendPayment({
  recipientAddress,
  amount,
  userAddress,
  gridUserId
}: TransactionParams): Promise<string> {

  try {
    // ========== ÉTAPE 1: Créer l'intention de paiement ==========
    console.log('📝 Creating payment intent...');

    const accessToken = await SecureStore.getItemAsync('access_token');

    const intentResponse = await fetch('http://localhost:3001/grid/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        smartAccountAddress: userAddress,
        payload: {
          amount: (amount * 1_000_000).toString(),
          grid_user_id: gridUserId,
          source: {
            account: userAddress,
            currency: "usdc"
          },
          destination: {
            address: recipientAddress,
            currency: "usdc"
          }
        },
        useMpcProvider: true
      })
    });

    if (!intentResponse.ok) {
      throw new Error('Failed to create payment intent');
    }

    const intentData = await intentResponse.json();
    const transactionPayload = intentData.data.transactionPayload;

    // ========== ÉTAPE 2: Signer la transaction ==========
    console.log('✍️ Signing transaction...');

    const sessionSecretsStr = await SecureStore.getItemAsync('session_secrets');
    const sessionSecrets = JSON.parse(sessionSecretsStr!);

    const userDataStr = await SecureStore.getItemAsync('user_data');
    const userData = JSON.parse(userDataStr!);

    const gridClient = new SDKGridClient({
      environment: 'production',
      baseUrl: 'https://grid.squads.xyz'
    });

    const signedPayload = await gridClient.sign({
      sessionSecrets: sessionSecrets,
      session: userData.authentication,
      transactionPayload: transactionPayload
    });

    // ========== ÉTAPE 3: Confirmer et envoyer ==========
    console.log('🚀 Sending transaction...');

    const confirmResponse = await fetch('http://localhost:3001/grid/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        address: userAddress,
        signedTransactionPayload: signedPayload
      })
    });

    if (!confirmResponse.ok) {
      const error = await confirmResponse.json();
      throw new Error(error.error || 'Transaction failed');
    }

    const result = await confirmResponse.json();
    const signature = result.signature;

    console.log('✅ Transaction sent! Signature:', signature);

    return signature;

  } catch (error) {
    console.error('❌ Transaction error:', error);
    throw error;
  }
}

// ========== UTILISATION ==========

// Envoyer 10.5 USDC
const signature = await sendPayment({
  recipientAddress: 'DestinationAddress...',
  amount: 10.5,
  userAddress: 'SourceAddress...',
  gridUserId: 'user_id_from_auth'
});

console.log('Transaction signature:', signature);
```

---

## ⚠️ Points d'Attention

### 1. Conversion des Montants

USDC utilise **6 décimales** :
- 1 USDC = 1_000_000 microUSDC
- 10.5 USDC = 10_500_000 microUSDC

```typescript
// ✅ Correct
amount: (10.5 * 1_000_000).toString() // "10500000"

// ❌ Incorrect
amount: "10.5"
amount: 10.5
```

### 2. SessionSecrets

Les `sessionSecrets` doivent être :
- Générés lors de l'authentification avec `generateSessionSecrets()`
- Sauvegardés dans SecureStore
- Réutilisés pour toutes les transactions

```typescript
// Lors de l'authentification
const sessionSecrets = await generateSessionSecrets();
await SecureStore.setItemAsync('session_secrets', JSON.stringify(sessionSecrets));

// Lors d'une transaction
const sessionSecretsStr = await SecureStore.getItemAsync('session_secrets');
const sessionSecrets = JSON.parse(sessionSecretsStr!);
```

### 3. User Authentication

L'objet `user.authentication` est retourné lors de l'authentification :

```typescript
// Lors de l'authentification (/grid/auth/verify)
const authResponse = await fetch('http://localhost:3001/grid/auth/verify', ...);
const authData = await authResponse.json();

// Sauvegarder tout l'objet user
await SecureStore.setItemAsync('user_data', JSON.stringify(authData.user));

// Utiliser lors de la signature
const userData = JSON.parse(await SecureStore.getItemAsync('user_data'));
const authentication = userData.authentication;
```

### 4. Gestion des Erreurs

```typescript
try {
  const signature = await sendPayment({ ... });
} catch (error: any) {
  // Erreur session expirée
  if (error.code === 'SESSION_EXPIRED') {
    // Rediriger vers login
    router.push('/login');
  }

  // Solde insuffisant
  if (error.message?.includes('insufficient balance')) {
    Alert.alert('Erreur', 'Solde insuffisant');
  }

  // Adresse invalide
  if (error.message?.includes('invalid address')) {
    Alert.alert('Erreur', 'Adresse de destinataire invalide');
  }

  // Autre erreur
  Alert.alert('Erreur', 'La transaction a échoué');
}
```

---

## 📊 Exemple d'Intégration dans un Composant

```typescript
import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';

export function SendMoneyScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!recipient || !amount) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      // Récupérer les infos utilisateur
      const userDataStr = await SecureStore.getItemAsync('user_data');
      const userData = JSON.parse(userDataStr!);

      const signature = await sendPayment({
        recipientAddress: recipient,
        amount: parseFloat(amount),
        userAddress: userData.address,
        gridUserId: userData.grid_user_id
      });

      Alert.alert(
        'Succès',
        `Transaction envoyée!\nSignature: ${signature.substring(0, 10)}...`,
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Transaction échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Adresse du destinataire"
        value={recipient}
        onChangeText={setRecipient}
      />

      <TextInput
        placeholder="Montant (USDC)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Button
        title={loading ? "Envoi en cours..." : "Envoyer"}
        onPress={handleSend}
        disabled={loading}
      />
    </View>
  );
}
```

---

## 🧪 Tester une Transaction

### 1. Avec cURL (sans signature - impossible)

La signature DOIT être faite côté client car elle nécessite les `sessionSecrets` privés.

### 2. Depuis le Frontend

1. Assurez-vous d'être authentifié
2. Avoir du USDC sur le compte source
3. Utiliser une adresse de destinataire valide
4. Tester avec un petit montant d'abord

### 3. Vérifier le Solde Après

```typescript
const balance = await fetch('http://localhost:3001/grid/balance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    smartAccountAddress: userAddress
  })
});

const balanceData = await balance.json();
console.log('New balance:', balanceData.data.sol);
```

---

## 📚 Ressources

- [API Backend - Routes de transactions](/src/routes/transaction.routes.ts)
- [Exemple officiel GRID](/neobank-example-app/app/(send)/confirm.tsx)
- [Documentation GRID SDK](https://docs.grid.sqds.io)

---

**Dernière mise à jour :** 2025-10-21
