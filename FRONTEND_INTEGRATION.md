# Guide d'Intégration Frontend - Migration vers GRID SDK

Ce guide explique comment adapter votre frontend pour utiliser les nouveaux endpoints GRID.

## 📋 Résumé des changements

| Ancien Endpoint | Nouveau Endpoint | Changements |
|----------------|------------------|-------------|
| `POST /grid/auth` | `POST /grid/auth` | ✅ Identique |
| `POST /grid/auth/verify` | `POST /grid/auth/verify` | ⚠️ Format body modifié |
| `POST /grid/accounts` | `POST /grid/accounts` | ✅ Identique |
| `POST /grid/accounts/verify` | `POST /grid/accounts/verify` | ⚠️ Format body modifié |
| N/A | `POST /grid/smart-accounts` | 🆕 Nouveau |
| N/A | `POST /grid/balance` | 🆕 Nouveau |
| N/A | `GET /grid/transfers` | 🆕 Nouveau |
| N/A | `POST /grid/payment-intent` | 🆕 Nouveau |
| N/A | `POST /grid/confirm` | 🆕 Nouveau |

---

## 🔐 1. Authentification

### 1.1 Login - Étape 1 : Demander l'OTP

**Fichier:** `src/screens/Auth.tsx:92`

✅ **Aucun changement nécessaire**

```typescript
// AVANT et APRÈS - Identique
const response = await fetch('http://localhost:3001/grid/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});

const data = await response.json();
// data.session_id
```

### 1.2 Login - Étape 2 : Vérifier l'OTP

**Fichier:** `src/screens/Auth.tsx:164`

⚠️ **Changement du format du body**

```typescript
// AVANT
const response = await fetch('http://localhost:3001/grid/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    otp_code: otpCode
  })
});

// APRÈS - Même endpoint, même format body
// Aucun changement nécessaire si vous utilisez déjà ce format
const response = await fetch('http://localhost:3001/grid/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    otp_code: otpCode
  })
});

const data = await response.json();
// data = { tokens: { access_token, refresh_token, expires_in }, user: { ... } }
```

---

## 👤 2. Création de Compte

### 2.1 Register - Étape 1 : Demander l'OTP

**Fichier:** `src/screens/Auth.tsx:92`

✅ **Aucun changement nécessaire**

```typescript
// AVANT et APRÈS - Identique
const response = await fetch('http://localhost:3001/grid/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});

const data = await response.json();
// data.session_id
```

### 2.2 Register - Étape 2 : Vérifier l'OTP

**Fichier:** `src/screens/Auth.tsx:164`

⚠️ **Changement du format du body**

```typescript
// AVANT
const response = await fetch('http://localhost:3001/grid/accounts/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    otp_code: otpCode
  })
});

// APRÈS - Body enrichi avec sessionSecrets et user
const response = await fetch('http://localhost:3001/grid/accounts/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    otp_code: otpCode,           // ou otpCode (les deux fonctionnent)
    sessionSecrets: {},           // 🆕 Requis par GRID SDK
    user: {                       // 🆕 Requis par GRID SDK
      email: email
    }
  })
});

const data = await response.json();
// data = { tokens: { access_token, refresh_token, expires_in }, user: { ... } }
```

---

## 💰 3. Gestion des Comptes et Soldes

### 3.1 Créer un Smart Account

🆕 **Nouvel endpoint à intégrer**

```typescript
// Créer un smart account Solana pour l'utilisateur
const response = await fetch('http://localhost:3001/grid/smart-accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    network: 'solana-devnet'  // ou 'solana-mainnet' en production
  })
});

const data = await response.json();
// data contient les informations du smart account créé
```

### 3.2 Récupérer le Solde

🆕 **Remplace les appels Solana RPC directs**

**Fichier à modifier:** `src/services/solanaService.ts:24`

```typescript
// AVANT - Appel RPC direct
const balance = await connection.getBalance(publicKey);

// APRÈS - Utiliser le backend GRID
const response = await fetch('http://localhost:3001/grid/balance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    smartAccountAddress: userWalletAddress
  })
});

const data = await response.json();
// data contient les balances (SOL + tokens SPL)
```

### 3.3 Récupérer l'Historique des Transferts

🆕 **Remplace getSignaturesForAddress**

**Fichier à modifier:** `src/components/TransactionHistory.tsx:102`

```typescript
// AVANT - Appel RPC direct
const signatures = await connection.getSignaturesForAddress(publicKey);

// APRÈS - Utiliser le backend GRID
const smartAccountAddress = encodeURIComponent(userWalletAddress);
const response = await fetch(
  `http://localhost:3001/grid/transfers?smart_account_address=${smartAccountAddress}`,
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const data = await response.json();
// data contient l'historique des transferts
```

---

## 💸 4. Transactions

### 4.1 Créer une Intention de Paiement

🆕 **Nouvelle approche pour préparer une transaction**

**Fichier à créer/modifier:** `src/services/transactionService.ts`

```typescript
// Étape 1: Créer l'intention de paiement
const response = await fetch('http://localhost:3001/grid/payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    smartAccountAddress: userWalletAddress,
    payload: {
      amount: '1000000',              // Montant en lamports
      destination: recipientAddress,   // Adresse du destinataire
      token: 'SOL'                     // ou adresse du token SPL
    }
  })
});

const paymentIntent = await response.json();
// paymentIntent contient la transaction à signer
```

### 4.2 Signer et Envoyer la Transaction

🆕 **Confirmer et envoyer la transaction signée**

```typescript
// Étape 2: Signer la transaction (côté client avec le wallet)
// Cette partie dépend de votre implémentation de signature
const signedTransaction = await signTransaction(paymentIntent.transaction);

// Étape 3: Envoyer la transaction signée au backend
const response = await fetch('http://localhost:3001/grid/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    address: userWalletAddress,
    signedTransactionPayload: signedTransaction  // Transaction signée en base64
  })
});

const result = await response.json();
// result contient la signature de la transaction
console.log('Transaction signature:', result.signature);
```

### 4.3 Exemple Complet de Transfert

**Fichier à modifier:** `src/screens/SendConfirmation.tsx:84`

```typescript
// AVANT - Appel direct aux endpoints /api/v1/transaction/*
const handleSendTransaction = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/v1/transaction/public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        toAddress: recipientAddress,
        amount: amount
      })
    });
    // ...
  } catch (error) {
    console.error(error);
  }
};

// APRÈS - Utiliser GRID SDK (2 étapes)
const handleSendTransaction = async () => {
  try {
    // Étape 1: Créer l'intention de paiement
    const intentResponse = await fetch('http://localhost:3001/grid/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        smartAccountAddress: userWalletAddress,
        payload: {
          amount: String(amount * 1e9), // Convertir en lamports
          destination: recipientAddress,
          token: 'SOL'
        }
      })
    });

    const paymentIntent = await intentResponse.json();

    // Étape 2: Signer (à implémenter selon votre wallet)
    const signedTx = await signTransactionWithWallet(paymentIntent.transaction);

    // Étape 3: Confirmer et envoyer
    const confirmResponse = await fetch('http://localhost:3001/grid/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        address: userWalletAddress,
        signedTransactionPayload: signedTx
      })
    });

    const result = await confirmResponse.json();
    console.log('Transaction envoyée:', result.signature);

    // Afficher succès à l'utilisateur
    Alert.alert('Succès', `Transaction envoyée: ${result.signature}`);
  } catch (error) {
    console.error('Erreur transaction:', error);
    Alert.alert('Erreur', 'Échec de la transaction');
  }
};
```

---

## 🗑️ Endpoints à Supprimer

Ces endpoints ne sont plus nécessaires avec GRID SDK:

❌ **À supprimer:**
- `POST /api/v1/transaction/private` - Remplacé par payment-intent + confirm
- `POST /api/v1/transaction/public` - Remplacé par payment-intent + confirm
- `GET /arcium/wallets/{userId}/{walletId}/balance-total` - Remplacé par /grid/balance
- `GET /arcium/wallets/{userId}/{walletId}/transactions` - Remplacé par /grid/transfers

---

## 🔧 Modifications Recommandées par Fichier

### `src/screens/Auth.tsx`

```typescript
// Ligne 164 - Modifier la vérification OTP pour register
const verifyOtpAndRegister = async (email: string, otpCode: string) => {
  const response = await fetch('http://localhost:3001/grid/accounts/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      otp_code: otpCode,
      sessionSecrets: {},  // 🆕 Ajouté
      user: { email }      // 🆕 Ajouté
    })
  });
  return response.json();
};
```

### `src/services/solanaService.ts`

```typescript
// Remplacer getBalance
export const getBalance = async (address: string, accessToken: string) => {
  const response = await fetch('http://localhost:3001/grid/balance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ smartAccountAddress: address })
  });
  return response.json();
};
```

### `src/components/TransactionHistory.tsx`

```typescript
// Ligne 102 - Remplacer getSignaturesForAddress
export const getTransactions = async (address: string, accessToken: string) => {
  const response = await fetch(
    `http://localhost:3001/grid/transfers?smart_account_address=${encodeURIComponent(address)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
};
```

### `src/screens/SendConfirmation.tsx` & `src/screens/SendPrivateConfirmation.tsx`

```typescript
// Remplacer les lignes 84 et 96
// Voir l'exemple complet dans la section 4.3 ci-dessus
```

---

## 🔑 Gestion de l'Authorization Header

Tous les endpoints protégés nécessitent maintenant un token d'accès:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
}
```

Le `accessToken` est retourné par:
- `/grid/auth/verify` (login)
- `/grid/accounts/verify` (register)

Stockez-le de manière sécurisée et incluez-le dans chaque requête.

---

## ⚠️ Gestion des Erreurs

Le backend retourne des erreurs au format:

```json
{
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": [],
  "status": 400
}
```

Codes d'erreur possibles:
- `SESSION_EXPIRED` - Session expirée, redemander l'authentification
- `INVALID_OTP` - Code OTP invalide
- `ACCOUNT_NOT_FOUND` - Compte introuvable
- `INSUFFICIENT_BALANCE` - Solde insuffisant
- `TRANSACTION_FAILED` - Échec de la transaction
- `VALIDATION_ERROR` - Erreur de validation

---

## 📝 Checklist de Migration

- [ ] Mettre à jour l'URL de base de l'API: `http://localhost:3001`
- [ ] Modifier `Auth.tsx` pour ajouter `sessionSecrets` et `user` dans `/accounts/verify`
- [ ] Remplacer les appels Solana RPC par les endpoints GRID
- [ ] Créer un smart account après l'inscription
- [ ] Implémenter le flux payment-intent + confirm pour les transactions
- [ ] Ajouter l'Authorization header à toutes les requêtes protégées
- [ ] Supprimer les anciens endpoints Arcium
- [ ] Tester le flux complet: Register → Login → Balance → Transaction
- [ ] Gérer les erreurs SESSION_EXPIRED pour rafraîchir le token

---

## 🧪 Test de l'Intégration

1. **Test Authentification:**
   ```bash
   # Demander OTP
   curl -X POST http://localhost:3001/grid/auth \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Test Balance:**
   ```bash
   curl -X POST http://localhost:3001/grid/balance \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"smartAccountAddress":"YOUR_ADDRESS"}'
   ```

3. **Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```

---

## 📞 Support

En cas de problème d'intégration:
1. Vérifiez que le backend est bien démarré (`npm run dev`)
2. Consultez les logs du backend
3. Vérifiez que `GRID_API_KEY` est configuré dans `.env`
4. Testez les endpoints avec curl ou Postman avant de les intégrer au frontend

---

**Dernière mise à jour:** 2025-10-21
