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
- React Native 0.81 + Expo ~54 + TypeScript
- React 19, custom swipe pager (react-native-reanimated)
- Solana: @solana/web3.js, @solana/spl-token, @coral-xyz/anchor
- Auth/Wallet: Turnkey (@turnkey/react-native-wallet-kit) avec passkeys
- Privacy: @umbra-privacy/sdk + mopro-ffi (Rust ZK provers)
- Yield: @arcium-hq/client (x25519, RescueCipher) + backend MPC
- State: React Query (@tanstack/react-query) + AuthContext
- Real-time: socket.io-client
- Storage: expo-secure-store (keychain), walletKeyCache (RAM+Keychain)
- UI: react-native-reanimated, expo-linear-gradient, Sansation font

## Architecture

### Structure src/
- `app/` : Screens par flow - (auth), (tabs), (send), (add), (deposit), (savings), (infos)
- `components/` : UI reutilisables (BalanceCards, SlideToConfirm, TransactionHistory)
- `contexts/AuthContext.tsx` : State global (user, session, wallets, socket auto-subscribe)
- `hooks/` : Logique metier organisee par domaine
  - `auth/` : useSignUp, useSignIn, useEmailVerificationPolling
  - `wallet/` : useWalletInfos, useSetupWallet, useExportWallet, useInitPrivateWallet
  - `transactions/` : useSendSimpleTransaction (buildTransaction + transactionTurnkey/transactionSimple), useUmbra
- `services/` : Domaines API isoles
  - `api/` : clientStealf (Bearer auth), fetchWalletInfos (query factories)
  - `yield/` : deposit (Arcium encrypt + memo), withdraw (POST API), balance (GET API)
  - `real-time/` : socketService (singleton Socket.io)
  - `solana/` : transactionsGuard, moproZkProvers, zkCircuitManager, umbraSeed
  - `cache/` : walletKeyCache (RAM + Keychain, 15 min TTL)
  - `auth/` : authStorage (SecureStore)
- `navigation/` : AppNavigator (auth conditionnel) + swipePager (Home/Privacy/Profile)
- `constants/` : solana.ts (mints, vault), turnkey.ts (org, RP, curve)

### Fichiers racine importants
- `polyfills.ts` : Crypto.subtle, Buffer, TextEncoder, DOMException, Blob patch (Hermes)
- `metro.config.js` : Module resolution (snarkjs browser, crypto/fs shims, SVG transformer)
- `crypto-shim.js` : randomBytes + createHash("sha256") via @noble/hashes
- `fs-shim.js` : Module vide pour @arcium-hq/client
- `modules/mopro-ffi/` : Bindings natifs Rust (UBRN) pour ZK proofs (iOS xcframework + Android JNI)

### Patterns cles
- **Deux modes de signing** : `transactionTurnkey` (cash_wallet via Turnkey) vs `transactionSimple` (stealf_wallet via SecureStore keypair)
- React Query pour cache balance/transactions (staleTime: Infinity), invalide via Socket.io events
- Socket.io singleton souscrit aux wallets, ecoute `balance:updated`, `transaction:new`, `private-balance:updated`
- API backend Stealf avec Bearer token (useAuthenticatedApi)
- transactionsGuard valide adresse/montant/solde avant envoi
- walletKeyCache : cle privee en RAM (15 min TTL) + Keychain fallback, touch() apres chaque signing
- ZK circuits telechargees depuis CDN, cachees localement (expo-file-system)

### Flow yield (Arcium + Jito SOL)
- **Deposit** : encrypt userId (x25519 + RescueCipher) -> SOL transfer vers STEALF_JITO_VAULT avec memo chiffre -> signe via stealf_wallet
- **Withdraw** : POST /api/yield/withdraw { userId, amount, wallet }
- **Balance** : GET /api/yield/balance/:userId (MPC cote backend)
- **Stats** : GET /api/yield/stats -> { rate, apy } (React Query, 5 min staleTime)

### Flow utilisateur
1. Signup email + passkey (Turnkey) -> verification email
2. Setup wallet : creer (BIP39 24 mots) ou importer mnemonic
3. 3 tabs swipeable : Home (cash) / Privacy / Profile
4. Overlays slide-up : Send, SendPrivate, AddFunds, Savings, moove...

## Config
- Variables env dans `.env` (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SOLANA_RPC_URL, EXPO_PUBLIC_ORGANIZATION_ID...)
- Turnkey RP ID: stealf.xyz, curve ED25519, path m/44'/501'/0'/0'
- Passkeys necessitent device physique (pas de simulateur)
- USDC mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (devnet)
- Jito vault: 7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7

## Commandes
```
npx expo start          # Dev server
npx expo run:ios        # Build iOS
npx expo run:android    # Build Android
```

## Conventions
- Hooks custom pour chaque flow metier, organises par domaine (auth/, wallet/, transactions/)
- Services separes pour chaque domaine API (yield/, solana/, api/)
- Screens dans des groupes () par feature
- Theme dark (#000000), font Sansation (Bold, Regular, Light)
- Animations via react-native-reanimated (spring physics, gestures)
- SlideToConfirm pour les actions critiques (send, deposit, withdraw)

## Documentation
- `.claude/docs/architecture.md` : Architecture detaillee + schema ASCII
- `.claude/docs/pipeline.md` : Flows front/back + schemas ASCII
- `.claude/docs/audit-security.md` : Audit securite
