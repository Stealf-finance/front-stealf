# Stealf

Privacy-first neobank on Solana. Two wallets, one app.

## Concept

Stealf is a mobile fintech with a dual-wallet architecture:

- **Cash Wallet** -- Public, KYC/AML compliant wallet for everyday banking (payments, transfers). Managed by Turnkey with passkey authentication.
- **Privacy Wallet** -- Encrypted wallet for private investment and storage. Transfers via Umbra Privacy Protocol. Yield via Arcium MPC.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo 54 + TypeScript |
| UI | React 19, react-native-reanimated, custom swipe pager |
| Blockchain | Solana (@solana/web3.js, @solana/spl-token, @coral-xyz/anchor) |
| Auth | Turnkey passkeys (@turnkey/react-native-wallet-kit) |
| Privacy | Umbra Privacy SDK + ZK proofs via Mopro FFI (Rust) |
| Yield | Arcium MPC encryption (x25519 + RescueCipher) + Jito SOL |
| State | React Query (@tanstack/react-query) + AuthContext |
| Real-time | Socket.io (balance updates, new transactions) |
| Storage | expo-secure-store (keychain), async-storage |

## Getting Started

```bash
npm install
npx expo start
npx expo run:ios     # Build iOS (physical device required for passkeys)
npx expo run:android # Build Android
```

### Environment Variables

Create a `.env` file at the root:

```
EXPO_PUBLIC_API_URL=https://...
EXPO_PUBLIC_SOLANA_RPC_URL=https://...
EXPO_PUBLIC_SOLANA_WSS_URL=wss://...
EXPO_PUBLIC_ORGANIZATION_ID=...
EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID=...
EXPO_PUBLIC_UMBRA_RELAYER_URL=https://...
```

> Passkeys require a physical device -- simulators are not supported.
> Turnkey SDK is native -- Expo Go does not work.
> Local backend: use local IP (e.g. `192.168.1.36:3000`) when testing on device.

## Project Structure

```
src/
  app/           Screens by feature: (auth), (tabs), (send), (savings)...
  components/    Reusable UI (BalanceCards, SlideToConfirm, TransactionHistory)
  contexts/      AuthContext (global auth state)
  hooks/         Business logic (auth, wallet, transactions, umbra)
  services/      API, socket, yield, solana utils, caching
  navigation/    AppNavigator + custom swipe pager (3 tabs)
  constants/     Solana addresses, Turnkey config
modules/
  mopro-ffi/     Native Rust FFI for ZK proof generation (iOS + Android)
```

See [.claude/docs/architecture.md](.claude/docs/architecture.md) for the full architecture.
See [.claude/docs/pipeline.md](.claude/docs/pipeline.md) for frontend/backend flows.

## Team

Thomas & Louis. MVP phase.

## External Dependencies

| Dependency | Status |
|------------|--------|
| **Umbra Privacy** | Awaiting mainnet for private transfers |
| **Rain.xyz** | Banking integration (cards, wire transfers) after fundraise |
