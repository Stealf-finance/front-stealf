# Documentation des Appels API - Stealf Frontend

## Résumé

Cette documentation décrit tous les appels API effectués par l'application frontend Stealf vers différentes APIs externes et vers le backend.

**URL de base de l'API backend:** `http://16.171.31.132:3001`

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Transactions](#2-transactions)
3. [Solana Blockchain](#3-solana-blockchain)
4. [Prix des Crypto-monnaies](#4-prix-des-crypto-monnaies)
5. [Wallet Privé (Arcium)](#5-wallet-privé-arcium)

---

## 1. Authentification

### 1.1 Login - Étape 1: Demande de code OTP

**Fichier:** `src/screens/Auth.tsx:92`

- **Endpoint:** `POST /grid/auth`
- **URL complète:** `http://16.171.31.132:3001/grid/auth`
- **Description:** Initie le processus de connexion en envoyant un code OTP à l'email fourni
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "session_id": "string"
  }
  ```

### 1.2 Register - Étape 1: Demande de code OTP

**Fichier:** `src/screens/Auth.tsx:92`

- **Endpoint:** `POST /grid/accounts`
- **URL complète:** `http://16.171.31.132:3001/grid/accounts`
- **Description:** Initie le processus d'inscription en envoyant un code OTP à l'email fourni
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "session_id": "string"
  }
  ```

### 1.3 Login - Étape 2: Vérification du code OTP

**Fichier:** `src/screens/Auth.tsx:164`

- **Endpoint:** `POST /grid/auth/verify`
- **URL complète:** `http://16.171.31.132:3001/grid/auth/verify`
- **Description:** Vérifie le code OTP pour finaliser la connexion
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "session_id": "string",
    "otp_code": "123456"
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "tokens": {
      "access_token": "string",
      "refresh_token": "string",
      "expires_in": 3600
    },
    "user": {
      "email": "string",
      "username": "string",
      "grid_address": "string"
    }
  }
  ```

### 1.4 Register - Étape 2: Vérification du code OTP

**Fichier:** `src/screens/Auth.tsx:164`

- **Endpoint:** `POST /grid/accounts/verify`
- **URL complète:** `http://16.171.31.132:3001/grid/accounts/verify`
- **Description:** Vérifie le code OTP pour finaliser l'inscription
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "otp_code": "123456"
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "tokens": {
      "access_token": "string",
      "refresh_token": "string",
      "expires_in": 3600
    },
    "user": {
      "email": "string",
      "username": "string",
      "grid_address": "string"
    }
  }
  ```

---

## 2. Transactions

### 2.1 Transfert vers Wallet Privé

**Fichier:** `src/screens/SendConfirmation.tsx:84` et `src/screens/SendPrivateConfirmation.tsx:83`

- **Endpoint:** `POST /api/v1/transaction/private`
- **URL complète:** `http://16.171.31.132:3001/api/v1/transaction/private`
- **Description:** Transfère des fonds depuis le wallet public vers le wallet privé de l'utilisateur
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {access_token}"
  }
  ```
- **Body:**
  ```json
  {
    "amount": 100.5
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "success": true,
    "data": {
      "signature": "transaction_signature_string"
    }
  }
  ```

### 2.2 Transfert vers Wallet Externe

**Fichier:** `src/screens/SendConfirmation.tsx:96` et `src/screens/SendPrivateConfirmation.tsx:95`

- **Endpoint:** `POST /api/v1/transaction/public`
- **URL complète:** `http://16.171.31.132:3001/api/v1/transaction/public`
- **Description:** Transfère des fonds vers une adresse de wallet externe
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer {access_token}"
  }
  ```
- **Body:**
  ```json
  {
    "toAddress": "SolanaWalletAddress...",
    "amount": 50.25
  }
  ```
- **Réponse (succès):**
  ```json
  {
    "success": true,
    "data": {
      "signature": "transaction_signature_string"
    }
  }
  ```

---

## 3. Solana Blockchain

### 3.1 Récupération du Solde (via Solana RPC)

**Fichier:** `src/services/solanaService.ts:24`

- **Endpoint:** Via Solana RPC - `connection.getBalance()`
- **URL:** `https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` ou `https://api.devnet.solana.com`
- **Description:** Récupère le solde SOL d'une adresse publique
- **Méthode:** Appel RPC via `@solana/web3.js`
- **Paramètres:**
  - `address`: Adresse publique Solana
- **Retour:**
  ```typescript
  {
    sol: number,
    lamports: number,
    tokens: TokenBalance[]
  }
  ```

### 3.2 Récupération des Token Accounts

**Fichier:** `src/services/solanaService.ts:28`

- **Endpoint:** Via Solana RPC - `connection.getParsedTokenAccountsByOwner()`
- **Description:** Récupère tous les tokens SPL détenus par une adresse
- **Méthode:** Appel RPC via `@solana/web3.js`
- **Retour:** Liste de tokens avec leurs montants

### 3.3 Récupération de l'Historique des Transactions

**Fichier:** `src/components/TransactionHistory.tsx:102`

- **Endpoint:** Via Solana RPC - `connection.getSignaturesForAddress()`
- **Description:** Récupère les signatures de transactions pour une adresse
- **Méthode:** Appel RPC via `@solana/web3.js`
- **Paramètres:**
  - `address`: Adresse publique Solana
  - `limit`: Nombre maximum de transactions

### 3.4 Récupération des Détails d'une Transaction

**Fichier:** `src/components/TransactionHistory.tsx:117`

- **Endpoint:** Via Solana RPC - `connection.getParsedTransaction()`
- **Description:** Récupère les détails complets d'une transaction
- **Méthode:** Appel RPC via `@solana/web3.js`
- **Paramètres:**
  - `signature`: Signature de la transaction
  - `maxSupportedTransactionVersion`: 0

---

## 4. Prix des Crypto-monnaies

### 4.1 Récupération du Prix SOL

**Fichier:** `src/services/priceService.ts:41`

- **Endpoint:** `GET /simple/price`
- **URL complète:** `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true`
- **Description:** Récupère le prix actuel du SOL en USD depuis CoinGecko
- **Headers:** Aucun
- **Query Parameters:**
  - `ids`: `solana`
  - `vs_currencies`: `usd`
  - `include_24hr_change`: `true`
- **Réponse (succès):**
  ```json
  {
    "solana": {
      "usd": 100.50,
      "usd_24h_change": 2.5
    }
  }
  ```
- **Cache:** 60 secondes

### 4.2 Récupération de Prix Multiples

**Fichier:** `src/services/priceService.ts:82`

- **Endpoint:** `GET /simple/price`
- **URL complète:** `https://api.coingecko.com/api/v3/simple/price?ids={coinIds}&vs_currencies=usd`
- **Description:** Récupère les prix de plusieurs crypto-monnaies en une seule requête
- **Query Parameters:**
  - `ids`: Liste de coins séparés par des virgules (ex: `solana,bitcoin,ethereum`)
  - `vs_currencies`: `usd`
- **Réponse (succès):**
  ```json
  {
    "solana": { "usd": 100.50 },
    "bitcoin": { "usd": 45000.00 }
  }
  ```

---

## 5. Wallet Privé (Arcium)

### 5.1 Récupération du Solde Total d'un Wallet Privé

**Fichier:** `src/hooks/usePrivateBalance.ts:38`

- **Endpoint:** `GET /arcium/wallets/{userId}/{walletId}/balance-total`
- **URL complète:** `http://16.171.31.132:3001/arcium/wallets/{userId}/{walletId}/balance-total`
- **Description:** Récupère le solde total d'un wallet privé Arcium
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Path Parameters:**
  - `userId`: ID de l'utilisateur (extrait du JWT)
  - `walletId`: ID du wallet (`privacy_1`, `yield_1`, etc.)
- **Réponse (succès):**
  ```json
  {
    "balance": 123.45
  }
  ```

### 5.2 Récupération de l'Historique des Transactions Privées

**Fichier:** `src/components/PrivateTransactionHistory.tsx:106`

- **Endpoint:** `GET /arcium/wallets/{userId}/{walletId}/transactions`
- **URL complète:** `http://16.171.31.132:3001/arcium/wallets/{userId}/{walletId}/transactions`
- **Description:** Récupère l'historique des transactions privées d'un wallet Arcium
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Path Parameters:**
  - `userId`: ID de l'utilisateur (extrait du JWT)
  - `walletId`: ID du wallet (`privacy_1`, etc.)
- **Réponse (succès):**
  ```json
  {
    "success": true,
    "transactions": [
      {
        "type": "deposit",
        "amount": 1000000000,
        "signature": "transaction_signature",
        "timestamp": 1234567890000
      },
      {
        "type": "withdrawal",
        "amount": 500000000,
        "signature": "transaction_signature",
        "timestamp": 1234567890000
      }
    ]
  }
  ```

---

## Notes Techniques

### Gestion de l'Authentification

- Les tokens d'accès sont stockés de manière sécurisée via `authStorage.saveAuth()`
- Le token est automatiquement inclus dans le header `Authorization: Bearer {token}` pour les endpoints protégés
- Les tokens ont une durée de vie limitée (par défaut 3600 secondes / 1 heure)

### Gestion du Cache

1. **Prix (CoinGecko):**
   - Cache de 60 secondes
   - Stocké en mémoire

2. **Solde du Wallet:**
   - Cache de 30 secondes
   - Stocké en mémoire

3. **Historique des Transactions:**
   - Cache de 5 secondes
   - Stocké dans AsyncStorage
   - Clé: `transactions_cache_{walletAddress}`

4. **Historique des Transactions Privées:**
   - Cache de 5 secondes
   - Stocké dans AsyncStorage
   - Clé: `private_transactions_cache_{userId}_{walletId}`

### Gestion des Erreurs

Toutes les requêtes incluent une gestion d'erreurs complète avec:
- Messages d'erreur personnalisés selon le statut HTTP
- Fallback vers des valeurs par défaut ou cache expiré si disponible
- Logging des erreurs dans la console pour le debugging

### Rate Limiting

- Les appels RPC Solana incluent des délais de 100ms entre chaque transaction pour éviter le rate limiting
- Les prix CoinGecko sont mis en cache pour réduire le nombre de requêtes

---

## Schéma de Communication

```
┌─────────────────┐
│  Frontend App   │
└────────┬────────┘
         │
         ├──────────────────────────────┐
         │                              │
         │ Authentification             │ Transactions
         │ & Wallets Privés             │ & Prix
         │                              │
         v                              v
┌────────────────────┐         ┌──────────────────┐
│   Backend API      │         │  External APIs   │
│  16.171.31.132     │         │                  │
│  Port 3001         │         │ - CoinGecko      │
└────────┬───────────┘         │ - Solana RPC     │
         │                     └──────────────────┘
         │
         v
┌────────────────────┐
│  Solana Blockchain │
│  (Devnet)          │
└────────────────────┘
```

---

**Dernière mise à jour:** 2025-10-21
