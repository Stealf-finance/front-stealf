# Stealf - Neobank Privacy-First sur Solana

## Projet
Stealf est une neobank/fintech a double wallets sur Solana. Equipe : Thomas et Louis. Phase actuelle : MVP.

### Cash Wallet (public)
- Wallet conforme KYC/AML pour usage bancaire quotidien
- Paiements carte bancaire, virements bancaires
- Aucune encryption - conformite reglementaire prioritaire
- Infra bancaire cible : Rain.xyz (en attente de levee de fonds)

### Privacy Wallet (investissement)
- Stockage et investissement securise, donnees non exposees on-chain
- Transfers prives via Umbra Privacy Protocol (en attente mainnet)
- Concu pour proteger la vie privee financiere des utilisateurs

### Roadmap / Dependances externes
- **Umbra Privacy** : en attente du mainnet pour les transfers prives
- **Rain.xyz** : integration bancaire (cartes, virements) apres levee de fonds
- Statut : MVP en developpement

## Stack
- React Native 0.81 + Expo ~54 + TypeScript
- React 19, React Navigation (stack), custom swipe pager
- Solana: @solana/web3.js, @solana/spl-token, @coral-xyz/anchor
- Auth/Wallet: Turnkey (@turnkey/react-native-wallet-kit) avec passkeys
- State: React Query (@tanstack/react-query) + AuthContext
- Real-time: socket.io-client
- Storage: expo-secure-store, async-storage
- UI: react-native-reanimated, expo-linear-gradient, expo-blur

## Architecture

### Deux wallets
- **cash_wallet** : wallet public, conforme KYC/AML, usage bancaire quotidien (SOL, USDC). Futur : cartes/virements via Rain.xyz
- **stealf_wallet** : wallet privacy pour investissement/stockage securise. Transfers prives via vault (futur : Umbra Privacy)

### Structure src/
- `app/` : Screens organisees par flow - (auth), (tabs), (send), (add), (deposit), (infos)
- `components/` : UI reutilisables (BalanceCards, TransactionHistory, modals)
- `contexts/AuthContext.tsx` : State global auth (user, session, tokens, wallets)
- `hooks/` : Logique metier (useSignUp, useSignIn, useWalletInfos, useSendSimpleTransaction, usePrivacyCashTransfer, useSocket...)
- `services/` : API calls (clientStealf, fetchWalletInfos, privacyCashApi, socketService, transactionsGuard)
- `navigation/` : AppNavigator (auth conditionnel) + swipePager (Home/Privacy/Profile)
- `constants/` : Config Turnkey, adresses tokens, vault
- `types/` : Types TS (navigation, privacyCash)

### Patterns cles
- React Query pour cache balance/transactions, invalide via events Socket.io
- Turnkey gere passkeys, creation wallet (ED25519), signing transactions
- Socket.io singleton souscrit aux wallets, ecoute `balance:updated`, `transaction:new`, `private-balance:updated`
- API backend Stealf avec Bearer token (useAuthenticatedApi)
- transactionsGuard valide adresse/montant/solde avant envoi
- Theme dark (#000000), font Sansation

### Flow utilisateur
1. Signup email + passkey (Turnkey) -> verification email
2. Setup wallet (cash + stealf)
3. 3 tabs swipeable : Home (cash) / Privacy / Profile
4. Modals pour Send, AddFunds, Deposit

## Config
- Variables env dans `.env` (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SOLANA_RPC_URL, EXPO_PUBLIC_ORGANIZATION_ID...)
- Turnkey RP ID: stealf.xyz, curve ED25519, path m/44'/501'/0'/0'
- Passkeys necessitent device physique (pas de simulateur)

## Commandes
```
npx expo start          # Dev server
npx expo run:ios        # Build iOS
npx expo run:android    # Build Android
```

## Conventions
- Hooks custom pour chaque flow metier
- Services separes pour chaque domaine API
- Screens dans des groupes () par feature
- Animations via react-native-reanimated
