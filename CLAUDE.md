# Stealf - Neobank Privacy-First sur Solana

## Projet
Stealf est une neobank/fintech a double wallets sur Solana. Equipe : Thomas et Louis. Phase actuelle : MVP.

### Cash Wallet (public)
- Wallet Turnkey (passkeys), conforme KYC/AML pour usage bancaire quotidien
- Paiements carte bancaire, virements bancaires (futur : Rain.xyz)
- Signing via Turnkey SDK (`transactionTurnkey`)

### Privacy Wallet (stealf_wallet)
- Keypair ED25519 local, cle privee dans SecureStore (cache RAM 15 min via walletKeyCache)
- Investissement securise, yield via Arcium MPC + Jito SOL
- Transfers prives via Umbra Privacy Protocol (en attente mainnet)
- Signing via keypair local (`transactionSimple`)

### Roadmap / Dependances externes
- **Umbra Privacy** : en attente du mainnet pour les transfers prives
- **Rain.xyz** : integration bancaire (cartes, virements) apres levee de fonds

## Stack
- React Native 0.81 + Expo ~54 + TypeScript (strict mode)
- React 19, Expo Router v6 (file-based routing), custom swipe pager (react-native-reanimated)
- Solana: @solana/web3.js, @solana/spl-token, @coral-xyz/anchor
- Auth/Wallet: Turnkey (@turnkey/react-native-wallet-kit) avec passkeys
- Privacy: @umbra-privacy/sdk + mopro-ffi (Rust ZK provers)
- Yield: @arcium-hq/client (x25519, RescueCipher) + backend MPC
- State: React Query (@tanstack/react-query) + AuthContext
- Validation: zod (reponses API dans useWalletInfos)
- Real-time: socket.io-client
- Storage: expo-secure-store (keychain), walletKeyCache (RAM+Keychain)
- UI: react-native-reanimated, expo-linear-gradient, expo-image, expo-haptics, Sansation font
- Monitoring: @sentry/react-native (init root layout, captures ErrorBoundary, desactive en __DEV__)
- Offline: @react-native-community/netinfo + React Query onlineManager

## Architecture

### Structure src/
- `app/` : Expo Router root (configure via `["expo-router", { root: "src/app" }]` dans app.config.js)
  - `_layout.tsx` : Root layout - providers (QueryClient, AuthProvider, SafeAreaProvider, SplashProvider), SplashScreen.preventAutoHideAsync(), navigation auth (sign-in/sign-up vs app), Sentry init
  - `sign-in.tsx` : Route publique (passkey login)
  - `sign-up.tsx` : Route publique (useReducer pour le flow multi-etapes)
  - `(app)/` : Groupe protege
    - `_layout.tsx` : Auth guard (`<Redirect href="/sign-in" />`), PagerProvider, Stack avec modals
    - `(tabs)/` : Tabs swipeable
      - `_layout.tsx` : MinimalNavBar + RevolutPager
      - `index.tsx` : Home (cash wallet dashboard)
      - `privacy.tsx` : Privacy wallet dashboard
      - `profile.tsx` : User profile
    - `send.tsx`, `send-private.tsx`, `moove.tsx`, `add-funds.tsx`, etc. : Routes modales
- `components/` : UI reutilisables (BalanceCards, SlideToConfirm, TransactionHistory, WalletSetup, Verified, AnimatedSplash)
- `contexts/` :
  - `AuthContext.tsx` : State global (user, session, wallets, socket auto-subscribe)
  - `SplashContext.tsx` : State WelcomeLoader (actif uniquement pendant sign-in passkey / sign-up)
  - `PagerContext.tsx` : State du swipe pager (index tab courante)
- `hooks/` : Logique metier organisee par domaine
  - `auth/` : useSignUp, useSignIn, useEmailVerificationPolling
  - `wallet/` : useWalletInfos (validation zod), useSetupWallet, useExportWallet, useInitPrivateWallet
  - `transactions/` : useSendSimpleTransaction (buildTransaction + transactionTurnkey/transactionSimple), useUmbra
- `services/` : Domaines API isoles
  - `api/` : clientStealf (Bearer auth), client.ts (standalone non-hook), fetchWalletInfos (query factories)
  - `yield/` : deposit (Arcium encrypt + memo), withdraw (POST API), balance (GET API)
  - `real-time/` : socketService (singleton Socket.io)
  - `solana/` : transactionsGuard, moproZkProvers, zkCircuitManager, umbraSeed
  - `cache/` : walletKeyCache (RAM + Keychain, 15 min TTL)
  - `auth/` : authStorage (SecureStore)
- `navigation/` : PagerContext (swipe tab state)
- `constants/` : solana.ts (mints, vault), turnkey.ts (org, RP, curve)

### Fichiers racine importants
- `index.js` : Entry point - charge polyfills puis `expo-router/entry`
- `polyfills.ts` : Crypto.subtle, Buffer, TextEncoder, DOMException, Blob patch (Hermes)
- `metro.config.js` : Module resolution (snarkjs browser, crypto/fs shims, SVG transformer)
- `crypto-shim.js` : randomBytes + createHash("sha256") via @noble/hashes
- `fs-shim.js` : Module vide pour @arcium-hq/client
- `modules/mopro-ffi/` : Bindings natifs Rust (UBRN) pour ZK proofs (iOS xcframework + Android JNI)

### Patterns cles
- **Expo Router file-based routing** : routes definies par la structure fichiers dans `src/app/`, groupes `()` pour organisation logique
- **Auth guard** : `(app)/_layout.tsx` redirige vers `/sign-in` si non authentifie via `<Redirect />`
- **Splash** : `SplashScreen.preventAutoHideAsync()` dans root layout, `hideAsync()` une fois auth resolue + balance chargee
- **WelcomeLoader** : uniquement pendant les operations auth (sign-in passkey, sign-up), controle par SplashContext
- **Deux modes de signing** : `transactionTurnkey` (cash_wallet via Turnkey) vs `transactionSimple` (stealf_wallet via SecureStore keypair)
- **Optimisations** : FlatList, React.memo, useCallback, borderCurve, fontVariant tabular-nums, SafeAreaProvider, useSafeAreaInsets
- **expo-image** : remplace Image de react-native partout
- **Haptics** : expo-haptics sur SlideToConfirm
- React Query pour cache balance/transactions (staleTime: Infinity), invalide via Socket.io events
- **Offline** : NetInfo + React Query onlineManager pour gestion mode hors-ligne
- Socket.io singleton souscrit aux wallets, ecoute `balance:updated`, `transaction:new`, `private-balance:updated`
- API backend Stealf avec Bearer token (useAuthenticatedApi) + client standalone (`services/api/client.ts`)
- transactionsGuard valide adresse/montant/solde avant envoi
- walletKeyCache : cle privee en RAM (15 min TTL) + Keychain fallback, touch() apres chaque signing
- ZK circuits telechargees depuis CDN, cachees localement (expo-file-system)
- **Sentry** : init dans root layout, captures dans ErrorBoundary, desactive en __DEV__
- **Zod** : validation des reponses API dans useWalletInfos

### Flow yield (Arcium + Jito SOL)
- **Deposit** : encrypt userId (x25519 + RescueCipher) -> SOL transfer vers STEALF_JITO_VAULT avec memo chiffre -> signe via stealf_wallet
- **Withdraw** : POST /api/yield/withdraw { userId, amount, wallet }
- **Balance** : GET /api/yield/balance/:userId (MPC cote backend)
- **Stats** : GET /api/yield/stats -> { rate, apy } (React Query, 5 min staleTime)

### Flow utilisateur
1. Signup email + passkey (Turnkey) -> verification email -> WalletSetup (composant)
2. Setup wallet : creer (BIP39 24 mots) ou importer mnemonic
3. 3 tabs swipeable : Home (cash) / Privacy / Profile (Expo Router file-based)
4. Routes modales : send, send-private, add-funds, savings, moove...

## Config
- Variables env dans `.env` (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SOLANA_RPC_URL, EXPO_PUBLIC_ORGANIZATION_ID...)
- Turnkey RP ID: stealf.xyz, curve ED25519, path m/44'/501'/0'/0'
- Passkeys necessitent device physique (pas de simulateur)
- USDC mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (devnet)
- Jito vault: 7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7
- tsconfig: strict: true, baseUrl: ".", jsx: "react-jsx"

## Commandes
```
npx expo start          # Dev server
npx expo run:ios        # Build iOS
npx expo run:android    # Build Android
```

## Conventions
- Hooks custom pour chaque flow metier, organises par domaine (auth/, wallet/, transactions/)
- Services separes pour chaque domaine API (yield/, solana/, api/)
- Routes dans des groupes () par feature (Expo Router file-based)
- Theme dark (#000000), font Sansation (Bold, Regular, Light)
- Animations via react-native-reanimated (spring physics, gestures)
- SlideToConfirm pour les actions critiques (send, deposit, withdraw) avec haptics
- TypeScript strict mode active
- Validation zod pour les reponses API

## Documentation
- `.claude/docs/architecture.md` : Architecture detaillee + schema ASCII
- `.claude/docs/pipeline.md` : Flows front/back + schemas ASCII
- `.claude/docs/audit-security.md` : Audit securite
