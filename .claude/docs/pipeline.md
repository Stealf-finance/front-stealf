# Pipeline -- Flows Frontend / Backend

## Vue d'ensemble des communications

```
+--------------------+                  +--------------------+
|                    |   HTTP (REST)    |                    |
|   STEALF MOBILE    | <--------------> |   STEALF BACKEND   |
|   (React Native)   |   Bearer JWT     |   (Node.js)        |
|                    |                  |                    |
|                    |   WebSocket      |                    |
|                    | <--------------> |   Socket.io        |
|                    |   Real-time      |                    |
+--------+-----------+                  +--------+-----------+
         |                                       |
         |  RPC (HTTPS)                          |  RPC (HTTPS)
         v                                       v
+--------------------+                  +--------------------+
|   SOLANA NETWORK   |                  |   SOLANA NETWORK   |
|   (devnet/mainnet) |                  |   + Arcium MPC     |
+--------------------+                  +--------------------+
```

## 1. Authentification

### Inscription (Sign Up)

```
MOBILE                          BACKEND                     TURNKEY
  |                                |                           |
  |-- 1. email + pseudo ---------->|                           |
  |                                |-- check availability ---->|
  |<------ email dispo -----------|                           |
  |                                |                           |
  |-- 2. createPasskey() -------->|                           |
  |                                |                           |
  |-- 3. signUpWithPasskey() -----|-------------------------->|
  |<----- cash_wallet + session --|---------------------------|
  |                                |                           |
  |-- 4. POST /api/users/auth --->|                           |
  |   { email, pseudo,            |-- enregistre user ------->|
  |     cash_wallet }             |                           |
  |<------ user cree -------------|                           |
  |                                |                           |
  |-- 5. Setup stealf_wallet      |                           |
  |   (BIP39 24 mots -> ED25519)  |                           |
  |   Store cle -> SecureStore     |                           |
  |                                |                           |
  |-- 6. POST /api/users/auth --->|                           |
  |   { stealf_wallet }           |-- update user ----------->|
  |<------ OK --------------------|                           |
  |                                |                           |
  |-- 7. setUserData()            |                           |
  |   Socket subscribe             |                           |
  |   walletKeyCache warmup        |                           |
```

### Connexion (Sign In)

```
MOBILE                          BACKEND                     TURNKEY
  |                                |                           |
  |-- 1. loginWithPasskey() ------|-------------------------->|
  |<----- session + cash_wallet --|---------------------------|
  |                                |                           |
  |-- 2. GET /api/users/{wallet}->|                           |
  |<------ userData ---------------|                           |
  |                                |                           |
  |-- 3. setUserData()            |                           |
  |   Socket subscribe             |                           |
  |   walletKeyCache warmup        |                           |
```

## 2. Transactions

### Envoi SOL/Token (Cash Wallet -> Turnkey)

```
MOBILE                                    SOLANA
  |                                          |
  |-- 1. guardTransaction()                  |
  |   (valide adresse, montant, solde)       |
  |                                          |
  |-- 2. buildTransaction()                  |
  |   SystemProgram.transfer (SOL)           |
  |   ou createTransferInstruction (SPL)     |
  |                                          |
  |-- 3. getLatestBlockhash() -------------->|
  |<------ blockhash ------------------------|
  |                                          |
  |-- 4. transactionTurnkey()                |
  |   signAndSendTransaction (Turnkey SDK)   |
  |<------ txSignature ----------------------|
  |                                          |
  |-- 5. React Query invalidate             |
  |   (balance + history refresh)            |
```

### Envoi SOL (Stealf Wallet -> Local Signing)

```
MOBILE                                    SOLANA
  |                                          |
  |-- 1. buildTransaction()                  |
  |                                          |
  |-- 2. walletKeyCache.getPrivateKey()      |
  |   (RAM -> Keychain fallback)             |
  |                                          |
  |-- 3. transactionSimple()                 |
  |   Keypair.fromSecretKey()                |
  |   sendAndConfirmTransaction() ---------->|
  |<------ txSignature ----------------------|
  |                                          |
  |-- 4. walletKeyCache.touch()              |
  |   (refresh TTL 15 min)                   |
```

### Transfert Cash <-> Privacy (moove)

```
MOBILE                                    SOLANA
  |                                          |
  |-- 1. Choix direction                     |
  |   cash -> privacy : transactionTurnkey   |
  |   privacy -> cash : transactionSimple    |
  |                                          |
  |-- 2. buildTransaction()                  |
  |   from = cash_wallet ou stealf_wallet    |
  |   to = stealf_wallet ou cash_wallet      |
  |                                          |
  |-- 3. Sign & send (Turnkey ou local) ---->|
  |<------ txSignature ----------------------|
```

## 3. Yield (Jito SOL + Arcium MPC)

### Deposit

```
MOBILE                          BACKEND                     SOLANA
  |                                |                           |
  |-- 1. GET /api/yield/mxe-pubkey>|                           |
  |<----- mxePublicKey ------------|                           |
  |                                |                           |
  |-- 2. Encryption cote client    |                           |
  |   a. x25519 ephemeral keypair  |                           |
  |   b. sharedSecret = DH(eph, mxe)                          |
  |   c. cipher = RescueCipher(sharedSecret)                   |
  |   d. encrypt(userId hash)      |                           |
  |                                |                           |
  |-- 3. Build transaction         |                           |
  |   a. SystemProgram.transfer    |                           |
  |      from: stealf_wallet       |                           |
  |      to: STEALF_JITO_VAULT     |                           |
  |      amount: X lamports        |                           |
  |   b. Memo instruction          |                           |
  |      { hashUserId,             |                           |
  |        ephemeralPublicKey,     |                           |
  |        nonce, ciphertext }     |                           |
  |                                |                           |
  |-- 4. transactionSimple() -----|-------------------------->|
  |<----- txSignature ------------|---------------------------|
  |                                |                           |
  |                                |<-- Backend lit le memo ---|
  |                                |   Decrypt userId          |
  |                                |   Enregistre le depot     |
```

### Withdraw

```
MOBILE                          BACKEND                     SOLANA
  |                                |                           |
  |-- POST /api/yield/withdraw --->|                           |
  |   { userId: subOrgId,         |                           |
  |     amount: lamports,          |-- process withdrawal ---->|
  |     wallet: stealf_wallet }    |   (transfer depuis vault) |
  |<------ OK / Error ------------|<--------------------------|
```

### Balance

```
MOBILE                          BACKEND                     ARCIUM MPC
  |                                |                           |
  |-- GET /api/yield/balance/:id ->|                           |
  |                                |-- MPC get_balance ------->|
  |                                |   (Anchor + x25519 +     |
  |                                |    RescueCipher)          |
  |                                |<-- encrypted result ------|
  |                                |   decrypt balance         |
  |<------ { balance } ------------|                           |
```

### Stats

```
MOBILE                          BACKEND
  |                                |
  |-- GET /api/yield/stats ------->|
  |<------ { rate, apy } ---------|
  |                                |
  |   React Query (5 min staleTime)|
  |   Pas de refetch a chaque page |
```

## 4. Privacy (Umbra Protocol)

### Depot dans balance chiffree

```
MOBILE                          RELAYER                     SOLANA
  |                                |                           |
  |-- 1. register()                |                           |
  |   getUserRegistrationFunction  |                           |
  |   -> ZK proof (mopro-ffi)     |                           |
  |   -> on-chain registration ----|-------------------------->|
  |                                |                           |
  |-- 2. deposit(mint, amount)     |                           |
  |   getDirectDepositInto...      |                           |
  |   -> ZK proof (mopro-ffi)     |                           |
  |   -> deposit transaction ------|-------------------------->|
  |<------ txSignature ------------|---------------------------|
```

### Envoi prive

```
MOBILE                          RELAYER                     SOLANA
  |                                |                           |
  |-- sendPrivate(recipient,       |                           |
  |     mint, amount)              |                           |
  |   -> ZK proof (mopro-ffi)     |                           |
  |   -> create UTXO              |                           |
  |   -> submit via relayer ------>|-------------------------->|
  |<------ txSignature ------------|---------------------------|
  |                                |                           |
  | Recipient:                     |                           |
  |-- claimReceived(utxos)         |                           |
  |   -> ZK proof (mopro-ffi)     |                           |
  |   -> claim into encrypted -----|-------------------------->|
  |      balance                   |                           |
```

## 5. Real-time (Socket.io)

### Connexion et souscription

```
MOBILE                          BACKEND (Socket.io)
  |                                |
  |-- connect(jwtToken) --------->|
  |<------ connected -------------|
  |                                |
  |-- subscribeToWallet(cash) ---->|   Backend surveille
  |-- subscribeToWallet(stealf) -->|   les wallets via
  |                                |   Helius webhooks
  |                                |
```

### Mise a jour en temps reel

```
SOLANA          HELIUS WEBHOOK        BACKEND              MOBILE
  |                  |                    |                    |
  | tx confirmed --->|                    |                    |
  |                  |-- POST webhook --->|                    |
  |                  |                    |-- balance:updated >|
  |                  |                    |  { address,        |
  |                  |                    |    tokens[],       |
  |                  |                    |    totalUSD }      |
  |                  |                    |                    |
  |                  |                    |-- transaction:new >|
  |                  |                    |  { address,        |
  |                  |                    |    transaction }   |
  |                  |                    |                    |
  |                  |                    |              React Query
  |                  |                    |              setQueryData()
  |                  |                    |              (no refetch)
```

## 6. ZK Circuits (Mopro)

### Telechargement et cache

```
MOBILE                          CDN (CloudFront)
  |                                |
  |-- isCircuitCached(type)? NO    |
  |-- download .zkey ------------->|
  |<------ circuit file -----------|
  |   save to expo documents dir   |
  |                                |
  |-- isCircuitCached(type)? YES   |
  |   return local path            |
  |                                |
  |-- generateCircomProof()        |
  |   (JSI call -> Rust Arkworks)  |
  |   -> { proofA, proofB, proofC }|
```

## 7. API Endpoints utilises

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/auth` | Inscription / mise a jour user |
| GET | `/api/users/:wallet` | Recuperer user par wallet |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance/:address` | Balance + tokens |
| GET | `/api/wallet/transactions/:address` | Historique transactions |
| GET | `/api/sol-price` | Prix SOL en USD |

### Yield
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/yield/mxe-pubkey` | Cle publique MXE (encryption) |
| GET | `/api/yield/balance/:userId` | Balance yield (via MPC backend) |
| GET | `/api/yield/stats` | Stats yield { rate, apy } |
| POST | `/api/yield/withdraw` | Retrait yield { userId, amount, wallet } |

### Socket Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `balance:updated` | Server -> Client | { address, tokens[], totalUSD, timestamp } |
| `transaction:new` | Server -> Client | { address, transaction, timestamp } |
| `private-balance:updated` | Server -> Client | { sol, usdc } |
