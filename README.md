# Stealf - Mobile App

React Native (Expo) mobile application for Solana wallet management with private transaction support.

## Architecture

```
src/
├── app/                        # Screens
│   ├── (auth)/                 # Authentication
│   │   ├── SignUpScreen        # Registration (email + passkey)
│   │   ├── SignInScreen        # Login (passkey)
│   │   └── VerifiedScreen      # Email verified
│   ├── (tabs)/                 # Main screens (swipe navigation)
│   │   ├── HomeScreen          # Cash balance + transaction history
│   │   ├── PrivacyScreen       # Privacy balance + assets
│   │   └── Profile             # User profile
│   ├── (send)/                 # Send funds
│   │   ├── Send                # Amount input (USD)
│   │   ├── SendConfirmation    # Confirmation + destination address
│   │   ├── SendPrivate         # Private send (withdraw)
│   │   ├── SendPrivateConfirmation
│   │   └── moove               # Transfer between wallets (cash <-> privacy)
│   ├── (add)/                  # Add funds
│   │   ├── AddFunds            # Stablecoin deposit (QR + address)
│   │   └── AddFundsPrivacy     # Privacy wallet deposit
│   ├── (deposit)/
│   │   └── DepositPrivateCash  # Deposit to privacy cash (SOL)
│   └── (infos)/
│       ├── InfoScreen          # Information
│       ├── CardScreen          # Card
│       └── TransactionHistoryScreen
│
├── components/
│   ├── features/
│   │   ├── CashBalanceCard     # Cash balance card (home)
│   │   └── PrivacyBalanceCard  # Privacy balance card + assets
│   ├── TransactionHistory      # Transaction list
│   ├── MinimalNavBar           # Navigation bar
│   ├── AddFundsModal           # Deposit type selection modal
│   ├── AddFundsPrivacyModal    # Privacy deposit modal
│   └── SendPrivacyModal        # Privacy send modal
│
├── contexts/
│   └── AuthContext             # Global auth state (user, session, tokens)
│
├── hooks/
│   ├── useSignUp               # Registration (email verification + passkey)
│   ├── useSignIn               # Passkey login
│   ├── useWalletInfos          # Balance + tokens + transactions (react-query)
│   ├── usePrivacyBalance       # Privacy cash balance
│   ├── usePrivacyCashTransfer  # Privacy deposit/withdraw (vault + memo)
│   ├── useSendSimpleTransaction # Standard SOL transaction
│   ├── useSocket               # WebSocket connection (real-time updates)
│   ├── useExportWallet         # Private key export
│   └── useEmailVerificationPolling # Email verification polling
│
├── services/
│   ├── clientStealf            # Authenticated HTTP client (Stealf API)
│   ├── fetchWalletInfos        # Balance + transactions + SOL price queries
│   ├── privacyCashApi          # Privacy cash API (deposit, withdraw, status)
│   ├── socketService           # Socket.io client (balance:updated, transaction:new)
│   ├── transactionsGuard       # Pre-transaction validation (address, amount, balance)
│   └── authStorage             # Session storage (SecureStore)
│
├── navigation/
│   ├── AppNavigator            # Main navigation (auth vs app)
│   ├── swipePager              # Swipe navigation (home <-> privacy)
│   └── types                   # Navigation types
│
├── constants/
│   ├── turnkey                 # Turnkey config (org ID, proxy)
│   ├── token                   # Token config
│   └── vault                   # Vault config
│
├── types/
│   ├── index                   # Global types (SendScreenProps, etc.)
│   ├── privacyCash             # PrivateTransfer types, fees
│   ├── navigation              # Navigation types
│   └── svg.d                   # SVG declaration for imports
│
└── assets/
    ├── font/Sansation/         # Custom font
    └── buttons/                # SVG icons (deposit, send, moove, etc.)
```

## External Services

| Service | Usage |
|---------|-------|
| **Turnkey** | Wallet-as-a-service (wallet creation, passkeys, transaction signing) |
| **Solana** | Blockchain (SOL transactions, SPL tokens, memo program) |
| **Socket.io** | Real-time (balance notifications + new transactions) |
| **Expo** | React Native framework (build, fonts, clipboard, secure-store, etc.) |
| **React Query** | Data caching + synchronization (balance, transactions) |
| **Stealf API** | Custom backend (auth, wallets, privacy cash, history) |
| **Resend** | Verification email delivery |

## Setup

```bash
npm install
```

`.env`:
```env
EXPO_PUBLIC_ORGANIZATION_ID="turnkey-org-id"
EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID="turnkey-auth-proxy-id"
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
VAULT_ADDRESS=
```

## Run

```bash
# iOS (physical device required for passkeys)
npx expo run:ios --device

# Android
npx expo run:android --device
```

## Notes

- Passkeys require a physical device (no simulator support)
- Turnkey SDK is native, Expo Go does not work
- Local backend: use local IP (e.g. `192.168.1.36:3000`) when testing on physical device