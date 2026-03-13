# Audit Securite -- Stealf Frontend

Date : Mars 2026
Phase : MVP / Beta

## Resume

| Categorie | Niveau | Commentaire |
|-----------|--------|-------------|
| Stockage cles | Bon | SecureStore (Keychain iOS / Keystore Android) + RAM cache TTL |
| Auth | Bon | Passkeys (WebAuthn) via Turnkey, pas de mot de passe |
| Transport | Bon | HTTPS + Bearer JWT + Socket.io auth |
| Signing | Correct | Deux modes bien separes (Turnkey vs local) |
| Validation | Correct | transactionsGuard couvre les cas de base |
| Secrets .env | Attention | Pas de secret critique expose, mais verifier |
| ZK Proofs | Bon | Preuves generees en natif (Rust), pas de shortcut |
| Polyfills | Attention | Surface d'attaque elargie, a surveiller |

---

## 1. Gestion des cles privees

### Cash Wallet (Turnkey)
- Cle privee **jamais** sur le device
- Gestion cote Turnkey (HSM), signing via SDK
- Auth par passkey (WebAuthn) -- pas de mot de passe
- Session auto-refresh, callbacks onSessionExpired

**Verdict : Bon.** Le modele Turnkey est solide, la cle ne quitte jamais le HSM.

### Stealf Wallet (local)
- Cle privee ED25519 stockee dans `expo-secure-store` (Keychain iOS, Keystore Android)
- Cache RAM via `walletKeyCache` avec TTL 15 min
- `touch()` apres chaque signing pour refresh le TTL
- `clearAll()` au logout (RAM + Keychain)
- Keychain service : `com.stealf.wallet`, accessibilite `AFTER_FIRST_UNLOCK`

**Points positifs :**
- TTL de 15 min evite l'exposition prolongee en RAM
- Keychain protege par le Secure Enclave (iOS) / TEE (Android)
- Warmup depuis Keychain, pas de relecture excessive

**Points d'attention :**
- `AFTER_FIRST_UNLOCK` : la cle est accessible tant que le device est demarrant. `WHEN_UNLOCKED` serait plus restrictif mais casserait le background refresh
- Le mnemonic est en RAM uniquement (jamais persiste) -- bien, mais pas de backup si l'user quitte avant de l'avoir note

### Umbra Master Seed
- Stocke dans SecureStore (Keychain) en base64
- `umbraClearSeed()` au logout
- Pas de TTL cache -- charge a la demande

**Verdict : Correct.** Le seed est bien protege par le Keychain.

---

## 2. Authentification

### Passkeys (WebAuthn)
- Turnkey `@turnkey/react-native-wallet-kit`
- RP ID : `stealf.xyz`, RP Name : `Stealf`
- Curve : ED25519
- Pas de fallback mot de passe -- passkey only

**Points positifs :**
- Phishing-resistant (lie au domaine stealf.xyz)
- Pas de mot de passe a voler ou a bruteforcer
- Session JWT geree par Turnkey

**Points d'attention :**
- Perte du device = perte d'acces (sauf sync iCloud/Google)
- Pas de recovery flow visible dans le code actuel

---

## 3. Transport & API

### HTTP
- `useAuthenticatedApi()` ajoute `Authorization: Bearer {token}` a chaque requete
- Pas de token hardcode -- utilise `session.token` du TurnkeyProvider
- Erreurs HTTP parsees et remontees

### Socket.io
- Connexion avec token JWT (`auth: { token }`)
- Transport WebSocket (pas de polling HTTP)
- Reconnection automatique (5 tentatives, 1s delay)

**Points d'attention :**
- Le token JWT est-il valide pour Socket.io ? Verifier cote backend que la connexion socket est bien authentifiee
- Pas de chiffrement additionnel sur les events socket (les balances transitent en clair sur le WebSocket)

---

## 4. Validation des transactions

### transactionsGuard.ts
- `validateAddress()` : Base58, longueur 32-44, PublicKey parseable
- `validateAmount()` : Nombre > 0, max decimales
- `validateBalance()` : Solde suffisant (incluant fee 5000 lamports + rent-exempt 0.00089 SOL)
- `validateNotSelf()` : Empeche l'envoi a soi-meme
- `validateMnemonic()` : BIP39 12 ou 24 mots + checksum

**Points positifs :**
- Couverture correcte des cas de base
- Fee et rent-exempt pris en compte

**Points d'attention :**
- Pas de validation de montant max (un user pourrait envoyer tout son solde moins les fees)
- Le yield withdraw n'a pas de validation de montant suffisant cote front (desactive pour la beta)
- Pas de rate limiting cote front pour les appels API

---

## 5. Encryption yield (Arcium)

### Deposit
- `x25519` key exchange avec la cle publique MXE
- `RescueCipher` pour chiffrer le userId
- `sha256(u128LE(UUID))` pour le hash du userId
- Memo attache a la transaction SOL avec les donnees chiffrees

**Points positifs :**
- Le userId n'est jamais expose en clair on-chain
- Ephemeral keypair pour chaque depot (forward secrecy)
- Nonce aleatoire (16 bytes)

**Points d'attention :**
- La cle publique MXE est fetchee depuis le backend a chaque depot -- si le backend est compromis, il pourrait fournir une fausse cle
- Le memo est visible on-chain (chiffre mais pas invisible)
- Pas de verification de la cle MXE (pas de pinning)

### Balance & Withdraw
- Balance via API backend (le MPC se fait cote serveur)
- Withdraw via POST API -- le backend execute le retrait

**Verdict : Correct pour le MVP.** Le chiffrement cote client est bien implemente. La confiance repose sur le backend pour la cle MXE et le withdraw.

---

## 6. Polyfills & surface d'attaque

### polyfills.ts
- `crypto.subtle` via `react-native-quick-crypto` (OpenSSL natif)
- `Buffer` via npm `buffer` package
- `DOMException`, `AbortSignal.throwIfAborted` patches
- `Blob` patch pour ffjavascript

### crypto-shim.js
- `randomBytes()` via `globalThis.crypto.getRandomValues`
- `createHash("sha256")` via `@noble/hashes/sha256`

**Points d'attention :**
- Les polyfills elargissent la surface d'attaque -- chaque shim est un point potentiel de divergence avec l'implementation native
- Le `buffer` npm package a eu des vulnerabilites historiques
- `crypto-shim.js` ne supporte que SHA256 -- si un module demande un autre algo, ca crash silencieusement
- `fs-shim.js` est un module vide -- si `@arcium-hq/client` fait un vrai appel fs, ca fail silencieusement

---

## 7. Stockage local

| Donnee | Stockage | Chiffre | Commentaire |
|--------|----------|---------|-------------|
| User data (email, wallets) | SecureStore | Oui (Keychain) | Correct |
| Stealf wallet private key | SecureStore + RAM | Oui (Keychain) | TTL 15 min |
| Umbra master seed | SecureStore | Oui (Keychain) | Correct |
| Mnemonic | RAM only | Non persiste | Bien -- jamais ecrit sur disque |
| ZK circuits (.zkey) | expo-file-system | Non | Public data, pas de risque |
| Session JWT | Turnkey SDK | Interne | Gere par le SDK |

**Rien de sensible dans AsyncStorage ou le filesystem non-chiffre.**

---

## 8. Risques identifies

### Risque accepte (standard crypto)
1. **Self-custody stealf_wallet** : Si l'user perd son device et n'a pas note son mnemonic, les fonds sont perdus. C'est le modele standard de toutes les apps crypto (Phantom, Backpack, Solflare). Le cash_wallet (Turnkey) est recuperable via passkey sync (iCloud/Google).

### Risque moyen
2. **Confiance dans le backend pour le yield** : Le withdraw et le balance depend entierement du backend. Un backend compromis pourrait renvoyer une fausse balance ou bloquer les retraits.
3. **Cle MXE non verifiee** : La cle publique MXE est fetchee sans verification. Un MITM ou un backend compromis pourrait intercepter les depots.
4. **Pas de rate limiting frontend** : Un attaquant avec un token valide pourrait spammer les API.

### Risque faible
5. **Events socket en clair** : Les balances sont transmises en clair via WebSocket. TLS protege le transport, mais un proxy/CDN pourrait voir les montants.
6. **Polyfills** : Divergence potentielle entre les implementations polyfill et natives, surtout pour la crypto.
7. **USDC devnet** : L'adresse USDC (`4zMMC9...`) est un token devnet -- a changer avant le mainnet.

---

## 9. Recommandations

### Court terme (MVP)
- [ ] S'assurer que le flow de backup mnemonic est clair et visible (UX standard crypto)
- [ ] Ajouter une verification de la cle MXE (hash connu ou certificate pinning)
- [ ] Ajouter un rate limiter cote backend pour les API yield
- [ ] Valider le montant de withdraw cote front (re-activer la protection)

### Moyen terme (pre-mainnet)
- [ ] Optionnel : recovery flow avance (social recovery ou backup cloud chiffre)
- [ ] Migrer vers `WHEN_UNLOCKED` pour le SecureStore si le background refresh n'est pas necessaire
- [ ] Auditer les polyfills crypto (ou migrer vers react-native-quick-crypto pour tout)
- [ ] Ajouter du certificate pinning pour les appels API critiques
- [ ] Signer les events socket (HMAC) pour prevenir les injections

### Long terme (mainnet)
- [ ] Audit securite externe (smart contract + frontend + backend)
- [ ] Bug bounty program
- [ ] Monitoring des transactions suspectes (montants anormaux, patterns inhabituels)
- [ ] HSM ou enclave securisee pour le signing stealf_wallet (type Turnkey pour les deux wallets)
