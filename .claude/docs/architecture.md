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
|-- index.ts                    Entrypoint : polyfills + registerRootComponent
|-- App.tsx                     Root : QueryClient + TurnkeyProvider + AuthProvider + fonts
|-- polyfills.ts                Crypto.subtle, Buffer, TextEncoder, DOMException, Blob patch
|-- metro.config.js             Module resolution, shims, SVG transformer
|-- crypto-shim.js              randomBytes + createHash("sha256") via @noble/hashes
|-- fs-shim.js                  Module vide (shim pour @arcium-hq/client)
|-- babel.config.js             Expo preset + reanimated plugin
|-- app.config.js               Expo config (bundle ID, passkey RP, plugins)
|-- tsconfig.json               TS config (strict: false, skipLibCheck: true)
|-- package.json                Dependencies + scripts + patch-package
|-- .env                        Variables d'environnement (non commite)
|
|-- src/
|   |
|   |-- app/                                    SCREENS
|   |   |-- (auth)/
|   |   |   |-- SignInScreen.tsx                Login passkey
|   |   |   |-- SignUpScreen.tsx                Inscription multi-etapes
|   |   |   |-- VerifiedScreen.tsx              Email verifie
|   |   |   +-- WalletSetupScreen.tsx           Choix creer/importer wallet
|   |   |
|   |   |-- (tabs)/
|   |   |   |-- HomeScreen.tsx                  Dashboard cash wallet
|   |   |   |-- PrivacyScreen.tsx               Dashboard privacy wallet
|   |   |   +-- Profile.tsx                     Profil utilisateur
|   |   |
|   |   |-- (send)/
|   |   |   |-- Send.tsx                        Envoi cash (montant)
|   |   |   |-- SendConfirmation.tsx            Confirmation envoi
|   |   |   |-- SendPrivate.tsx                 Envoi prive (Umbra)
|   |   |   |-- SendPrivateConfirmation.tsx     Confirmation prive
|   |   |   +-- moove.tsx                       Transfert cash <-> privacy
|   |   |
|   |   |-- (add)/
|   |   |   |-- AddFunds.tsx                    Alimenter cash wallet
|   |   |   +-- AddFundsPrivacy.tsx             Alimenter privacy wallet
|   |   |
|   |   |-- (deposit)/
|   |   |   +-- DepositPrivateCash.tsx          Depot dans yield vault
|   |   |
|   |   |-- (savings)/
|   |   |   |-- SavingsScreen.tsx               Dashboard yield (APY, balance)
|   |   |   +-- DepositWithdrawModal.tsx         Modal deposit/withdraw
|   |   |
|   |   +-- (infos)/
|   |       |-- InfoScreen.tsx                  Infos bancaires
|   |       |-- CardScreen.tsx                  Gestion carte
|   |       +-- TransactionHistoryScreen.tsx    Historique complet
|   |
|   |-- components/
|   |   |-- MinimalNavBar.tsx                   Barre nav fixe (top)
|   |   |-- SlideToConfirm.tsx                  Swipe-to-confirm gesture
|   |   |-- TransactionHistory.tsx              Liste transactions
|   |   |-- SegmentedControl.tsx                Tab selector
|   |   |-- WelcomeLoader.tsx                   Splash anime
|   |   |-- AddFundsModal.tsx                   Modal ajout fonds
|   |   |-- SendModal.tsx / SendPrivacyModal.tsx
|   |   +-- features/
|   |       |-- CashBalanceCard.tsx             Carte balance cash
|   |       |-- PrivacyBalanceCard.tsx          Carte balance privacy
|   |       |-- PointsCard.tsx                  Points/rewards
|   |       +-- StatsCard.tsx                   Stats app
|   |
|   |-- contexts/
|   |   +-- AuthContext.tsx                     State global auth
|   |       UserData: { email, username, cash_wallet, stealf_wallet, subOrgId, points }
|   |       Fonctions: setUserData, logout
|   |       Auto-subscribe socket sur auth
|   |
|   |-- navigation/
|   |   |-- AppNavigator.tsx                    Nav principal (auth conditionnel + overlays)
|   |   |-- swipePager.tsx                      Pager 3 pages (gesture + spring physics)
|   |   +-- types.ts                            PageType definition
|   |
|   |-- hooks/
|   |   |-- auth/
|   |   |   |-- useSignUp.ts                    Flow inscription complet
|   |   |   |-- useSignIn.ts                    Login passkey
|   |   |   +-- useEmailVerificationPolling.ts  Polling verification email
|   |   |
|   |   |-- wallet/
|   |   |   |-- useWalletInfos.ts               React Query balance + history + socket
|   |   |   |-- useSetupWallet.ts               Creer/importer wallet (BIP39)
|   |   |   |-- useExportWallet.ts              Export cle privee
|   |   |   +-- useInitPrivateWallet.ts         Init Umbra registration
|   |   |
|   |   |-- transactions/
|   |   |   |-- useSendSimpleTransaction.ts     buildTransaction + transactionTurnkey/Simple
|   |   |   +-- useUmbra.ts                     Wrapper Umbra SDK complet
|   |   |
|   |   |-- useSocket.ts                        Attach/detach socket listeners
|   |   |-- useAppStats.ts                      Stats app
|   |   +-- useReserveProof.ts
|   |
|   |-- services/
|   |   |-- api/
|   |   |   |-- clientStealf.ts                 useAuthenticatedApi() { get, post, del }
|   |   |   +-- fetchWalletInfos.ts             Query factories (balance, history, price, yield)
|   |   |
|   |   |-- yield/
|   |   |   |-- deposit.ts                      Encrypt + transfer vers Jito vault
|   |   |   |-- withdraw.ts                     POST /api/yield/withdraw
|   |   |   |-- balance.ts                      GET /api/yield/balance/:userId
|   |   |   +-- private_yield.json              IDL Anchor (programme Arcium)
|   |   |
|   |   |-- real-time/
|   |   |   +-- socketService.ts                Singleton Socket.io
|   |   |
|   |   |-- solana/
|   |   |   |-- transactionsGuard.ts            Validation pre-envoi
|   |   |   |-- moproZkProvers.ts               Adapteurs Mopro FFI -> Umbra
|   |   |   |-- zkCircuitManager.ts             Download + cache .zkey depuis CDN
|   |   |   |-- umbraSeed.ts                    Stockage master seed Umbra (Keychain)
|   |   |   +-- swapService.ts                  (futur) Swap tokens
|   |   |
|   |   |-- cache/
|   |   |   +-- walletKeyCache.ts               RAM + Keychain, TTL 15 min
|   |   |
|   |   +-- auth/
|   |       +-- authStorage.ts                  SecureStore user data
|   |
|   |-- constants/
|   |   |-- solana.ts                           SOL_MINT, USDC_MINT, STEALF_JITO_VAULT
|   |   +-- turnkey.ts                          Org ID, RP stealf.xyz, ED25519, derivation path
|   |
|   |-- types/
|   |   |-- index.ts                            Re-export
|   |   |-- navigation.ts                       Props screens, PageType
|   |   +-- svg.d.ts                            Declaration SVG
|   |
|   |-- utils/
|   |   +-- animations.ts                       animateScreenIn/Out
|   |
|   +-- assets/
|       |-- fonts/Sansation/                    Bold, Regular, Light, Italic
|       |-- buttons/                            SVG icons
|       |-- logo/
|       +-- images/
|
+-- modules/
    +-- mopro-ffi/                              MODULE NATIF RUST
        |-- Cargo.toml                          Config build Rust
        +-- MoproReactNativeBindings/
            |-- package.json                    mopro-ffi v0.1.0
            |-- src/                            Source TS + native
            |-- lib/                            JS compile
            |-- ios/                            Objective-C bindings
            |-- android/                        Kotlin + JNI bindings
            |-- cpp/                            C++ FFI wrapper
            +-- MoproFfiFramework.xcframework/  iOS framework (libsteal.a)
```

## Polyfills & Shims

React Native (Hermes engine) ne supporte pas nativement les APIs Node.js/Web utilisees
par les libs Solana, Umbra, et Arcium. Voici la chaine de polyfills :

```
index.ts
  |
  +-- import './polyfills'  (PREMIER import, avant tout le reste)
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
  |
  +-- resolveRequest overrides:
  |     snarkjs       -> build/browser.esm.js    (evite imports Node)
  |     ffjavascript   -> build/browser.esm.js
  |     @bufbuild/protobuf/codegenv2             (fix package exports)
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
+------------------+     +------------------+     +------------------+
|   AuthContext     |     |   React Query    |     |   Socket.io      |
|                  |     |                  |     |                  |
| - userData       |     | - wallet-balance |     | - balance:updated|
| - session        |     | - wallet-history |     | - transaction:new|
| - isAuthenticated|     | - sol-price-usd  |     | - private-balance|
| - logout()       |     | - yield-stats    |     |   :updated       |
+------------------+     +------------------+     +------------------+
        |                        ^                        |
        |                        |   invalidate           |
        +----> socket subscribe  +------------------------+
```

## Navigation

```
AppNavigator
  |
  +-- [Non authentifie]
  |     SignInScreen <-> SignUpScreen -> VerifiedScreen -> WalletSetupScreen
  |
  +-- [Authentifie]
        |
        +-- MinimalNavBar (fixe en haut)
        |
        +-- RevolutPager (swipe horizontal, spring physics)
        |     |
        |     +-- Page 0: HomeScreen      (cash wallet)
        |     +-- Page 1: PrivacyScreen   (privacy wallet)
        |     +-- Page 2: Profile
        |
        +-- Overlays (slide-up depuis le bas)
              |
              +-- send / sendPrivate / moove
              +-- addFunds / addFundsPrivacy
              +-- depositPrivateCash / savings
              +-- info / transactionHistory
```
