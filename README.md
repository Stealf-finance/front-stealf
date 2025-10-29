# Stealf - React Native Wallet Application

A React Native mobile wallet application built with Expo, integrating GRID SDK for secure authentication and transactions on Solana.

---

## 📁 Project Structure

```
front-stealf/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── features/       # Feature-specific components (BalanceDisplay, etc.)
│   │   ├── layout/         # Layout components (Container, Header)
│   │   └── ui/             # Base UI components (Button, Card, Input)
│   ├── config/             # App configuration
│   ├── contexts/           # React contexts (AuthContext)
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation setup
│   ├── screens/            # Application screens
│   ├── services/           # API and blockchain services
│   ├── theme/              # Styling and theming
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── assets/                 # Images, fonts, etc.
├── App.tsx                 # Root component
├── index.ts                # Entry point
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.x
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

### Environment Variables

Create a `.env` file:

```env
HELIUS_API_KEY=your_helius_api_key
API_BASE_URL=http://16.171.31.132:3001
```

## 🔧 SDK Usage

### Installation

```bash
npm install @sqds/grid @sqds/grid/native
```

### Authentication Flow

```typescript
// 1. Request OTP
const response = await fetch('http://16.171.31.132:3001/grid/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
const { session_id } = await response.json();

// 2. Verify OTP
const verifyResponse = await fetch('http://16.171.31.132:3001/grid/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id, otp_code: '123456' })
});
const { tokens, user } = await verifyResponse.json();

// 3. Save tokens securely
await SecureStore.setItemAsync('access_token', tokens.access_token);
await SecureStore.setItemAsync('user_data', JSON.stringify(user));
```

### Transaction Flow

Transactions follow a 3-step process:

```typescript
import { SDKGridClient } from '@sqds/grid/native';

// Step 1: Create payment intent
const intentResponse = await fetch('http://16.171.31.132:3001/grid/payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    smartAccountAddress: userAddress,
    payload: {
      amount: '1000000', // 1 USDC in microUSDC
      grid_user_id: gridUserId,
      source: { account: userAddress, currency: 'usdc' },
      destination: { address: recipientAddress, currency: 'usdc' }
    },
    useMpcProvider: true
  })
});
const { data } = await intentResponse.json();

// Step 2: Sign transaction
const gridClient = new SDKGridClient({
  environment: 'production',
  baseUrl: 'https://grid.squads.xyz'
});

const sessionSecrets = JSON.parse(await SecureStore.getItemAsync('session_secrets'));
const userData = JSON.parse(await SecureStore.getItemAsync('user_data'));

const signedPayload = await gridClient.sign({
  sessionSecrets,
  session: userData.authentication,
  transactionPayload: data.transactionPayload
});

// Step 3: Confirm and send
const confirmResponse = await fetch('http://16.171.31.132:3001/grid/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    address: userAddress,
    signedTransactionPayload: signedPayload
  })
});
const { signature } = await confirmResponse.json();
```

## 📡 API Endpoints

**Base URL**: `http://16.171.31.132:3001`

### Authentication

#### Request OTP (Login)
```
POST /grid/auth
Body: { email: string }
Response: { session_id: string }
```

#### Verify OTP (Login)
```
POST /grid/auth/verify
Body: { session_id: string, otp_code: string }
Response: { tokens: {...}, user: {...} }
```

#### Request OTP (Register)
```
POST /grid/accounts
Body: { email: string }
Response: { session_id: string }
```

#### Verify OTP (Register)
```
POST /grid/accounts/verify
Body: { email: string, otp_code: string, sessionSecrets: {}, user: { email: string } }
Response: { tokens: {...}, user: {...} }
```

### Account Management

#### Create Smart Account
```
POST /grid/smart-accounts
Headers: { Authorization: 'Bearer {token}' }
Body: { network: 'solana-devnet' | 'solana-mainnet' }
```

#### Get Balance
```
POST /grid/balance
Headers: { Authorization: 'Bearer {token}' }
Body: { smartAccountAddress: string }
Response: { balance: {...} }
```

#### Get Transaction History
```
GET /grid/transfers?smart_account_address={address}
Headers: { Authorization: 'Bearer {token}' }
Response: { transfers: [...] }
```

### Transactions

#### Create Payment Intent
```
POST /grid/payment-intent
Headers: { Authorization: 'Bearer {token}' }
Body: {
  smartAccountAddress: string,
  payload: {
    amount: string,  // in microUSDC (1 USDC = 1,000,000)
    grid_user_id: string,
    source: { account: string, currency: 'usdc' },
    destination: { address: string, currency: 'usdc' }
  },
  useMpcProvider: boolean
}
Response: { data: { transactionPayload: string } }
```

#### Confirm Transaction
```
POST /grid/confirm
Headers: { Authorization: 'Bearer {token}' }
Body: {
  address: string,
  signedTransactionPayload: string
}
Response: { signature: string }
```


---

## 📱 Key Features

- **Email + OTP Authentication**: Secure login with GRID SDK
- **Smart Accounts**: GRID-powered smart accounts on Solana
- **Send/Receive USDC**: Transfer funds with MPC signing
- **Real-time Balance**: Live balance updates for SOL and USDC
- **Transaction History**: Complete history with filtering
- **Price Tracking**: Real-time USD price conversion

---

## 🛠️ Tech Stack

- **React Native** with **Expo**
- **TypeScript**
- **Solana** (@solana/web3.js)
- **GRID SDK** (@sqds/grid)
- **Expo SecureStore** for encrypted storage
- **AsyncStorage** for caching

---

**Last Updated**: 2025-10-29
