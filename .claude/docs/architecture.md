# Architecture -- Stealf Frontend

## Vue d'ensemble

```
+------------------------------------------------------------------+
|                        STEALF MOBILE APP                         |
|                  React Native 0.81 + Expo 54                     |
+------------------------------------------------------------------+
|                                                                  |
|  +-----------+  +-------------+  +-----------+                   |
|  |   Auth    |  |   Screens   |  | Components|                   |
|  | (Turnkey) |  | (app/)      |  | (UI)      |                   |
|  +-----------+  +-------------+  +-----------+                   |
|       |               |               |                          |
|  +----v---------------v---------------v----+                     |
|  |              HOOKS LAYER                |                     |
|  |  auth/ | wallet/ | transactions/        |                     |
|  +-----------------------------------------+                     |
|       |               |               |                          |
|  +----v---------------v---------------v----+                     |
|  |            SERVICES LAYER               |                     |
|  |  api/ | yield/ | solana/ | real-time/   |                     |
|  |  cache/ | auth/                         |                     |
|  +-----------------------------------------+                     |
|       |               |               |                          |
|  +----v----+   +------v------+   +----v--------+                 |
|  | Solana  |   |  Backend    |   |  Socket.io  |                 |
|  |  RPC    |   |  Stealf API |   |  Real-time  |                 |
|  +---------+   +-------------+   +-------------+                 |
|                                                                  |
|  +-----------------------------------------------------------+  |
|  |                    NATIVE MODULES                          |  |
|  |  mopro-ffi (Rust ZK)  |  Turnkey SDK  |  QuickCrypto     |  |
|  +-----------------------------------------------------------+  |
|                                                                  |
|  +-----------------------------------------------------------+  |
|  |                 POLYFILLS & SHIMS                          |  |
|  |  polyfills.ts | crypto-shim.js | fs-shim.js | metro.config|  |
|  +-----------------------------------------------------------+  |
+------------------------------------------------------------------+
```

## Arbre complet du projet

```
front-stealf/
|
|-- index.js                    Entrypoint : polyfills + expo-router/entry
|-- polyfills.ts                Crypto.subtle, Buffer, TextEncoder, DOMException, Blob patch
|-- metro.config.js             Module resolution, shims, SVG transformer
|-- crypto-shim.js              randomBytes + createHash("sha256") via @noble/hashes
|-- fs-shim.js                  Module vide (shim pour @arcium-hq/client)
|-- codegenv2-shim.js           Module vide (shim pour @bufbuild/protobuf/codegenv2)
|-- babel.config.js             Expo preset + reanimated plugin
|-- app.config.js               Expo config (bundle ID, passkey RP, expo-router, sentry)
|-- tsconfig.json               TS config (strict: true, baseUrl: ".", jsx: react-jsx)
|-- package.json                Dependencies + scripts (main: ./index.js)
|-- .env                        Variables d'environnement (non commite)
|
|-- src/
|   |
|   |-- app/                                    ROUTES (Expo Router, root: src/app)
|   |   |-- _layout.tsx                         Root layout: providers, splash, navigation
|   |   |-- sign-in.tsx                         Login passkey (public route)
|   |   |-- sign-up.tsx                         Inscription multi-etapes (public route)
|   |   |
|   |   +-- (app)/                              GROUPE PROTEGE (auth guard)
|   |       |-- _layout.tsx                     Auth guard + PagerProvider + Stack modals
|   |       |
|   |       |-- (tabs)/
|   |       |   |-- _layout.tsx                 MinimalNavBar + RevolutPager
|   |       |   |-- index.tsx                   Dashboard cash wallet
|   |       |   |-- privacy.tsx                 Dashboard privacy wallet
|   |       |   +-- profile.tsx                 Profil utilisateur
|   |       |
|   |       |-- send.tsx                        Envoi cash (montant) — modal
|   |       |-- send-confirmation.tsx           Confirmation envoi — modal
|   |       |-- send-private.tsx                Envoi prive (Umbra) — modal
|   |       |-- send-private-confirmation.tsx   Confirmation prive — modal
|   |       |-- moove.tsx                       Transfert cash <-> privacy — modal
|   |       |-- add-funds.tsx                   Alimenter cash wallet — modal
|   |       |-- add-funds-privacy.tsx           Alimenter privacy wallet — modal
|   |       |-- deposit-private.tsx             Depot dans yield vault — modal
|   |       |-- saving-dashboard.tsx            Dashboard yield (APY, balance) — modal
|   |       |-- deposit-withdraw.tsx            Modal deposit/withdraw
|   |       |-- info.tsx                        Infos bancaires — modal
|   |       +-- transaction-history.tsx         Historique complet — modal
|   |
|   |-- components/
|   |   |-- MinimalNavBar.tsx                   Barre nav fixe (React.memo)
|   |   |-- SlideToConfirm.tsx                  Swipe-to-confirm (reanimated + haptics)
|   |   |-- TransactionHistory.tsx              FlatList transactions (React.memo rows)
|   |   |-- SegmentedControl.tsx                Tab selector (React.memo)
|   |   |-- WelcomeLoader.tsx                   Loader anime (pendant auth operations)
|   |   |-- Verified.tsx                        Email verifie + passkey creation
|   |   |-- WalletSetup.tsx                     Choix creer/importer wallet
|   |   |-- AnimatedSplash.tsx                  Splash anime (expo-image)
|   |   |-- ErrorBoundary.tsx                   Error boundary (+ Sentry capture)
|   |   |-- AddFundsModal.tsx                   Modal ajout fonds
|   |   |-- SendModal.tsx / SendPrivacyModal.tsx
|   |   +-- features/
|   |       |-- CashBalanceCard.tsx             Carte balance cash (React.memo)
|   |       |-- PrivacyBalanceCard.tsx          Carte balance privacy (React.memo)
|   |       |-- PointsCard.tsx                  Points/rewards
|   |       +-- StatsCard.tsx                   Stats app
|   |
|   |-- contexts/
|   |   |-- AuthContext.tsx                     State global auth (bootDone + session restore)
|   |   +-- SplashContext.tsx                   State WelcomeLoader (showSplash/hideSplash)
|   |
|   |-- navigation/
|   |   |-- swipePager.tsx                      RevolutPager (gesture + spring physics)
|   |   |-- PagerContext.tsx                    State swipe index (currentPage, navigateToPage)
|   |   +-- types.ts                            PageType definition
|   |
|   |-- hooks/
|   |   |-- auth/
|   |   |   |-- useSignUp.ts                    Flow inscription (useReducer)
|   |   |   |-- useSignIn.ts                    Login passkey (onPasskeySuccess callback)
|   |   |   +-- useEmailVerificationPolling.ts  Polling verification email
|   |   |-- wallet/
|   |   |   |-- useWalletInfos.ts               React Query + Zod validation + socket
|   |   |   |-- useExportWallet.ts              Export cle privee
|   |   |   +-- useInitPrivateWallet.ts         Init Umbra registration
|   |   |-- transactions/
|   |   |   |-- useSendSimpleTransaction.ts     buildTransaction + signing
|   |   |   +-- useUmbra.ts                     Wrapper Umbra SDK
|   |   |-- useSocket.ts                        Socket listeners
|   |   |-- useAppStats.ts                      Stats app
|   |   +-- useReserveProof.ts
|   |
|   |-- services/
|   |   |-- api/
|   |   |   |-- clientStealf.ts                 useAuthenticatedApi() hook
|   |   |   |-- client.ts                       Standalone API client (apiGet, apiPost, apiDelete)
|   |   |   |-- fetchWalletInfos.ts             Query factories
|   |   |   +-- schemas.ts                      Zod schemas (balance, history, yield)
|   |   |-- yield/ deposit.ts, withdraw.ts, balance.ts
|   |   |-- real-time/ socketService.ts         Singleton Socket.io
|   |   |-- solana/ transactionsGuard.ts, moproZkProvers.ts, etc.
|   |   |-- cache/ walletKeyCache.ts
|   |   +-- auth/ authStorage.ts
|   |
|   |-- constants/ solana.ts, turnkey.ts
|   |-- types/ index.ts, navigation.ts, svg.d.ts
|   +-- assets/ fonts, buttons, logo, images
|
+-- modules/mopro-ffi/                         MODULE NATIF RUST (ZK proofs)
```

## Polyfills & Shims

React Native (Hermes engine) ne supporte pas nativement les APIs Node.js/Web utilisees
par les libs Solana, Umbra, et Arcium. Voici la chaine de polyfills :

```
index.js (NEW — replaces index.ts)
  |
  +-- import './polyfills'  (PREMIER import)
  +-- import 'react-native-gesture-handler'
  +-- import 'expo-router/entry'  (lance Expo Router)

polyfills.ts
  |
  +-- react-native-get-random-values     crypto.getRandomValues
  +-- react-native-quick-crypto          crypto.subtle (Web Crypto API)
  +-- react-native-url-polyfill          URL, URLSearchParams
  +-- buffer                             global.Buffer
  +-- text-encoding-polyfill             TextEncoder / TextDecoder
  +-- DOMException class                 Pour instanceof DOMException
  +-- AbortSignal.throwIfAborted         Pour Umbra SDK
  +-- Blob patch                         Pour ffjavascript (snarkjs)

metro.config.js
  |
  +-- extraNodeModules:
  |     stream  -> readable-stream
  |     buffer  -> buffer
  |     crypto  -> crypto-shim.js        randomBytes + createHash("sha256")
  |     fs      -> fs-shim.js            Module vide (pour @arcium-hq/client)
  |     isows   -> isows                 WebSocket shim
  |
  +-- resolveRequest overrides:
  |     snarkjs       -> build/browser.esm.js    (evite imports Node)
  |     ffjavascript   -> build/browser.esm.js
  |     @bufbuild/protobuf/codegenv2  -> codegenv2-shim.js  (fix package exports)
  |     @adraffy/ens-normalize                   (fix .cjs resolution)
  |
  +-- SVG transformer (react-native-svg-transformer)
```

## Module Natif : mopro-ffi

Module Rust compile en natif pour la generation de preuves ZK (Groth16/Circom).
Utilise par Umbra Privacy SDK pour les preuves de depot, retrait, et transfert prive.

```
mopro-ffi (Rust + UBRN)
  |
  +-- generateCircomProof(zkeyPath, serializedInputs, ProofLib)
       |
       +-- Charge le circuit .zkey (telecharge depuis CDN, cache local)
       +-- Execute le prover Groth16 en natif (Arkworks)
       +-- Retourne { proofA, proofB, proofC } en affine coords
       |
       +-- iOS : xcframework (libsteal.a, complie Rust)
       +-- Android : JNI + Gradle (Rust cross-compile)
```

## Gestion des cles

```
+-------------------+       +--------------------+
|   CASH WALLET     |       |   STEALF WALLET    |
|   (cash_wallet)   |       |   (stealf_wallet)  |
+-------------------+       +--------------------+
| Turnkey managed   |       | Self-custody       |
| Passkey auth      |       | ED25519 keypair    |
| Cloud-backed      |       | Local storage      |
+-------------------+       +--------------------+
         |                           |
         v                           v
+-------------------+       +--------------------+
| transactionTurnkey|       | transactionSimple  |
| signAndSendTx()   |       | sign() + send()    |
| (Turnkey SDK)     |       | (walletKeyCache)   |
+-------------------+       +--------------------+
                                     |
                             +-------v--------+
                             | walletKeyCache  |
                             |                 |
                             | RAM (15 min)    |
                             |    |            |
                             |    v            |
                             | Keychain        |
                             | (fallback)      |
                             +-----------------+
```

## State Management

```
+------------------+  +------------------+  +------------------+
|   AuthContext     |  |  SplashContext   |  |  PagerContext    |
| - userData        |  | - splashVisible  |  | - currentPage   |
| - isAuthenticated |  | - showSplash()   |  | - navigateToPage|
| - loading         |  | - hideSplash()   |  | - pagerRef      |
| - bootDone        |  +------------------+  +------------------+
+------------------+

+------------------+     +------------------+
|   React Query    |     |   Socket.io      |
|                  |     |                  |
| - wallet-balance |     | - balance:updated|
| - wallet-history |     | - transaction:new|
| - sol-price-usd  |     | - private-balance|
| - yield-stats    |     |   :updated       |
+------------------+     +------------------+
        ^                        |
        |   invalidate           |
        +------------------------+
```

## Navigation

```
Expo Router (file-based routing)
  |
  +-- src/app/_layout.tsx (Root)
  |     Providers + SplashScreen + auth navigation
  |
  +-- [Non authentifie]
  |     sign-in.tsx <-> sign-up.tsx (fade transition)
  |     sign-up.tsx renders Verified + WalletSetup inline
  |
  +-- [Authentifie] — (app)/ group
        |
        +-- (app)/_layout.tsx
        |     Auth guard: if (!isAuthenticated) <Redirect href="/sign-in" />
        |     PagerProvider + Stack (modals: transparentModal, slide_from_bottom)
        |
        +-- (tabs)/_layout.tsx
        |     MinimalNavBar (fixe en haut)
        |     RevolutPager (swipe horizontal, spring physics)
        |       Page 0: index.tsx (Home/cash)
        |       Page 1: privacy.tsx
        |       Page 2: profile.tsx
        |
        +-- Modal routes (push from tabs)
              send, send-private, moove, add-funds, etc.
```
