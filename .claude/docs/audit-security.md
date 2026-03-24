# Audit Securite -- Stealf Frontend

Date : Mars 2026 (mise a jour 24/03/2026)
Phase : MVP / Beta

## Resume

| Categorie | Niveau | Commentaire |
|-----------|--------|-------------|
| Stockage cles | Bon | SecureStore (Keychain iOS / Keystore Android) + RAM cache TTL |
| Auth | Bon | Passkeys (WebAuthn) via Turnkey, pas de mot de passe |
| Transport | Attention | HTTPS + Bearer JWT, mais pas de certificate pinning ni timeout |
| Signing | Attention | Deux modes bien separes, mais cles jamais zeroed en memoire |
| Validation | Correct | transactionsGuard couvre les cas de base, guard ajoute au yield deposit |
| Secrets .env | Attention | Pas de secret critique expose, mais adresses devnet hardcodees |
| ZK Proofs | Attention | Preuves generees en natif (Rust), mais pas de verification d'integrite des circuits |
| Polyfills | Attention | Surface d'attaque elargie, a surveiller |
| Logs prod | Attention | console.log sans guard __DEV__ (branch dev uniquement) |
| Clipboard | FIXE | Auto-clear 5s sur WalletSetupScreen et InfoScreen |

---

## ISSUES CRITIQUES — STATUT

### CRIT-01: Logs Turnkey exposent les adresses wallet en prod
- **Statut**: A FIXER AVANT PROD (OK sur branch dev)
- **Fichier**: `hooks/transactions/useSendSimpleTransaction.ts:75-77, 89-90, 100`
- **Fix**: Wrapper dans `if (__DEV__)` ou strip via babel plugin prod.

### ~~CRIT-02: Mnemonic copie dans le clipboard pendant 60s~~ FIXE
- **Fichier**: `app/(auth)/WalletSetupScreen.tsx:52-59`
- Auto-clear reduit de 60s a **5s**.

### ~~CRIT-03: Mnemonic copie dans le clipboard sans auto-clear~~ FIXE
- **Fichier**: `app/(infos)/InfoScreen.tsx:131-137`
- Auto-clear **5s** ajoute + message d'avertissement a l'utilisateur.

### ~~CRIT-04: exportColdWallet retourne une cle privee labellisee "mnemonic"~~ FIXE
- **Fichier**: `hooks/wallet/useExportWallet.ts:121-124`
- `ExportWalletResult` a maintenant un champ `privateKey` separe. L'UI affiche "Private Key (Base58)" ou "Recovery Phrase" selon le cas.

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
- `AFTER_FIRST_UNLOCK` : la cle est accessible tant que le device est demarre. `WHEN_UNLOCKED` serait plus restrictif mais casserait le background refresh
- Le mnemonic est en RAM uniquement (jamais persiste) -- bien, mais pas de backup si l'user quitte avant de l'avoir note
- **[HIGH] Cle privee jamais zeroed en memoire** (`useSendSimpleTransaction.ts:109-120`, `moove.tsx:52-65`): Le keypair decode reste dans le heap JS jusqu'au GC. Apres signing, `keypair.secretKey.fill(0)` reduirait l'exposition.
- **[HIGH] Ephemeral key et shared secret pas zeroed** (`deposit.ts:44-47`): `ephemeralPrivateKey` et `sharedSecret` du x25519 restent en memoire apres usage.
- **[MEDIUM] walletKeyCache.store() pas atomique** (`cache/walletKeyCache.ts:53-60`): RAM mis a jour avant le Keychain write. Si crash entre les deux → inconsistance. Ecrire au Keychain d'abord.

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
- **[MEDIUM] Pas de rate limit** sur resend magic link (`useSignUp.ts:216-243`). Ajouter un cooldown (30s).
- **[MEDIUM] Validation email minimale** (`useSignUp.ts:256-257`): Juste `!email.includes('@')`. Accepte `@`, `a@`, `@b`. Utiliser une regex ou lib de validation.

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

**Issues identifiees :**
- **[HIGH] Pas de SSL certificate pinning** (`socketService.ts`): Tous les appels API et socket.io vulnerables au MITM. Implementer via `react-native-ssl-pinning`.
- **[MEDIUM] Pas de timeout sur les API calls** (`clientStealf.ts`): `fetch()` sans AbortController. Si le serveur hang, l'app attend indefiniment. Ajouter un timeout de 15s.
- **[MEDIUM] Token JWT socket pas rafraichi** a la reconnexion (`socketService.ts:26-85`): Si le token expire pendant la session, les reconnexions echoueront silencieusement.
- **[MEDIUM] console.error sans guard __DEV__** dans plusieurs fichiers (`socketService.ts`, `withdraw.ts`, `deposit.ts`) — leak de details d'erreur dans les logs prod.

### Routes non authentifiees
- **[HIGH] useAppStats** (`useAppStats.ts:21-28`): Appel `fetch` sans Authorization header. Verifier si l'endpoint doit etre public.
- **[HIGH] useReserveProof** (`useReserveProof.ts:21-48`): Meme probleme. Ajouter l'auth si requis par le backend.

---

## 4. Validation des transactions

### transactionsGuard.ts
- `validateAddress()` : Base58, longueur 32-44, PublicKey parseable
- `validateAmount()` : Nombre > 0, max decimales
- `validateBalance()` : Solde suffisant (incluant fee 5000 lamports + rent-exempt 0.00089 SOL)
- `validateNotSelf()` : Empeche l'envoi a soi-meme
- `validateMnemonic()` : BIP39 12 ou 24 mots + checksum
- `guardTransaction()` : Chaine les validations, incluant desormais `validateBalance` avec `balanceSOL` optionnel

**Points positifs :**
- Couverture correcte des cas de base
- Fee et rent-exempt pris en compte
- Yield deposit valide le solde on-chain avant envoi (`deposit.ts`)

**Issues identifiees — FIXEES :**
- ~~**[HIGH] SendPrivateConfirmation walletType incorrect**~~: FIXE — passe maintenant `walletType: 'stealf'`.
- ~~**[HIGH] Moove sendRawTransaction sans confirmation**~~: FIXE — utilise `sendAndConfirmTransaction`.
- ~~**[MEDIUM] Withdraw sans validation de balance**~~: FIXE — valide `amount <= savingsBalance` avant l'appel API.

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
- Validation du solde avant envoi (ajout recemment)

**Points d'attention :**
- La cle publique MXE est fetchee depuis le backend a chaque depot -- si le backend est compromis, il pourrait fournir une fausse cle
- Le memo est visible on-chain (chiffre mais pas invisible)
- Pas de verification de la cle MXE (pas de pinning)
- **[MEDIUM]** Verifier que la taille du nonce (16 bytes) correspond a la spec RescueCipher

### Balance & Withdraw
- Balance via API backend (le MPC se fait cote serveur)
- Withdraw via POST API -- le backend execute le retrait

**Verdict : Correct pour le MVP.** Le chiffrement cote client est bien implemente. La confiance repose sur le backend pour la cle MXE et le withdraw.

---

## 6. ZK Proofs & Circuit Downloads

- **[HIGH] Pas de verification d'integrite** (`zkCircuitManager.ts:65-68`): Les fichiers `.zkey` telecharges depuis le CDN (`d1hi11upkav2nq.cloudfront.net`) n'ont aucun hash check. Le seul controle est `downloaded.size > 0`. Un CDN compromis pourrait servir des circuits malicieux.
- **Fix**: Stocker les SHA256 attendus dans le bundle app et verifier apres telechargement.

---

## 7. Polyfills & surface d'attaque

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

## 8. Code mort & doublons

- ~~**[MEDIUM] useSetupWallet.ts est du dead code**~~: Fichier deja supprime.
- ~~**[MEDIUM] derivePath duplique**~~: FIXE — extrait dans `utils/solanaKeyDerivation.ts`, importe par `moove.tsx` et `useInitPrivateWallet.ts`.
- ~~**[LOW] Import `use` inutilise**~~: FIXE — supprime de `useSocket.ts`.
- ~~**[LOW] Import `useEffect` inutilise**~~: FIXE — supprime de `AddFundsPrivacy.tsx`.
- **[LOW] `useFonts` appele dans chaque screen** au lieu d'une seule fois au niveau App. Pas un bug mais du gaspillage.
- **[LOW] 3 instances Connection Solana** separees (`useSendSimpleTransaction.ts:10`, `moove.tsx:28`, `deposit.ts:17`). Creer un singleton partage.

---

## 9. Performance & Race Conditions

### Performance
- **[MEDIUM] useAnimatedStyle dans .map()** (`swipePager.tsx:118-141`): Violation Rules of Hooks. Fonctionne car le tableau est stable, mais cassera si les pages changent dynamiquement.
- **[MEDIUM] 3 tab screens toujours rendus** (`AppNavigator.tsx:199-255`): HomeScreen, PrivacyScreen, ProfileScreen sont tous rendus simultanement avec leurs queries et listeners. Envisager le lazy-loading.

### Race Conditions
- **[HIGH] loadAuth sans annulation** (`AuthContext.tsx:37-71`): Pas d'AbortController. Si `session`/`user` changent rapidement → multiple `loadAuth` concurrents → sockets dupliques, prefetch dupliques. Ajouter un cleanup ou debounce.
- **[MEDIUM] saveUserData sans mutex** (`AuthContext.tsx:74-96`): Appels async qui peuvent s'entrelacer si appeles rapidement (signup flow).
- **[MEDIUM] useEmailVerificationPolling onVerified** dans les deps du useEffect (`useEmailVerificationPolling.ts:71`): Callback pas memoize → polling restart a chaque render.
- **[MEDIUM] onAuthStart appele dans le render** au lieu d'un useEffect (`VerifiedScreen.tsx:92`).

### Memory Leaks
- **[MEDIUM] useReserveProof** polling toutes les 5 min meme quand l'app est en background (`useReserveProof.ts:51-63`). Ajouter la detection de visibilite.

---

## 10. Stockage local

| Donnee | Stockage | Chiffre | Commentaire |
|--------|----------|---------|-------------|
| User data (email, wallets) | SecureStore | Oui (Keychain) | Correct, mais type `any` sans validation |
| Stealf wallet private key | SecureStore + RAM | Oui (Keychain) | TTL 15 min, pas zeroed apres usage |
| Umbra master seed | SecureStore | Oui (Keychain) | Correct |
| Mnemonic | RAM only | Non persiste | Bien -- jamais ecrit sur disque |
| ZK circuits (.zkey) | expo-file-system | Non | Public data, pas de risque si integrite verifiee |
| Session JWT | Turnkey SDK | Interne | Gere par le SDK |

**Rien de sensible dans AsyncStorage ou le filesystem non-chiffre.**

---

## 11. Configuration

- **[MEDIUM] Adresses devnet hardcodees** (`constants/solana.ts`): USDC mint et Jito vault sont des adresses devnet. Pas de configuration par environnement. Risque d'oublier de changer pour le mainnet.
- **Fix**: Utiliser des variables d'environnement avec des configs separees devnet/mainnet.

---

## 12. Recommandations

### Avant production (CRITIQUE)
- [x] ~~Fix clipboard mnemonic : auto-clear 5s~~ FAIT
- [x] ~~Fix label mnemonic vs cle privee dans exportColdWallet~~ FAIT
- [x] ~~Fix SendPrivateConfirmation walletType → `'stealf'`~~ FAIT
- [x] ~~Fix moove.tsx sendRawTransaction → sendAndConfirmTransaction~~ FAIT
- [x] ~~Supprimer `hooks/wallet/useSetupWallet.ts` (dead code)~~ DEJA FAIT
- [x] ~~Extraire derivePath dans un module utilitaire partage~~ FAIT
- [x] ~~Valider le montant withdraw cote front~~ FAIT
- [x] ~~Nettoyer imports morts (useSocket, AddFundsPrivacy)~~ FAIT
- [ ] Wrapper tous les `console.log`/`console.error` sensibles dans `__DEV__` ou strip via babel

### Court terme (pre-mainnet)
- [ ] Ajouter SSL certificate pinning
- [ ] Ajouter timeout (AbortController) sur tous les fetch
- [ ] Ajouter verification SHA256 des circuits ZK telecharges
- [ ] Zero les cles privees et shared secrets apres usage (`secretKey.fill(0)`)
- [ ] Ajouter rate limit sur resend magic link (cooldown 30s)
- [ ] Migrer adresses devnet vers config par environnement
- [ ] Ajouter AbortController/cleanup dans loadAuth (AuthContext)
- [ ] Verification de la cle MXE (hash connu ou certificate pinning)

### Moyen terme
- [ ] Recovery flow avance (social recovery ou backup cloud chiffre)
- [ ] Migrer vers `WHEN_UNLOCKED` pour le SecureStore si background refresh non necessaire
- [ ] Auditer les polyfills crypto (ou migrer vers react-native-quick-crypto pour tout)
- [ ] Signer les events socket (HMAC)
- [ ] Lazy-loading des tab screens non visibles
- [ ] authStorage avec interface typee au lieu de `any`

### Long terme (mainnet)
- [ ] Audit securite externe (smart contract + frontend + backend)
- [ ] Bug bounty program
- [ ] Monitoring des transactions suspectes
- [ ] HSM ou enclave securisee pour le signing stealf_wallet
