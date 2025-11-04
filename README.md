# Stealf - Application

---

## 📁 Project Structure

```
front-stealf/
├── src/
│   ├── app/                    # Application screens (Expo Router)
│   │   ├── (auth)/            # Authentication screens (Login, Register)
│   │   ├── (tabs)/            # Main tab screens (Home, Privacy, Profile)
│   │   ├── (send)/            # Send transaction screens
│   │   ├── (add)/             # Add funds screens
│   │   └── (infos)/           # Information screens
│   ├── components/            # Reusable UI components
│   │   ├── common/            # Common components (AppBackground)
│   │   ├── features/          # Feature-specific components (BalanceCard, etc.)
│   │   └── auth/              # Auth components (LoginSuccessAnimation)
│   ├── config/                # App configuration (Grid SDK setup)
│   ├── contexts/              # React contexts (AuthContext)
│   ├── hooks/                 # Custom React hooks
│   │   ├── auth/              # Authentication hooks (useLogin, useRegister)
│   │   └── ...                # Other hooks (useBalance, useWallet, etc.)
│   ├── navigation/            # Navigation setup
│   ├── services/              # Services (authStorage, biometricService)
│   ├── types/                 # TypeScript type definitions
│   └── assets/                # Fonts and images
├── App.tsx                    # Root component
├── app.config.js              # Expo configuration with env vars
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Expo CLI (installed automatically with npx)
- iOS Simulator or Android Emulator (for mobile testing)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
# or with clear cache
npx expo start --clear

# Run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

### Development Commands

```bash
# Start dev server
npx expo start --clear

# Start with specific port
npx expo start --clear --port 8082

# Type checking
npx tsc --noEmit

# Clear all caches and reinstall
rm -rf node_modules && npm install && npx expo start --clear
```

---

## 🔐 Environment Variables

Create a `.env` file at the root of the project:

```env
EXPO_PUBLIC_GRID_API_KEY=your_grid_api_key_here
EXPO_PUBLIC_GRID_ENV=production
```

**Important Notes:**
- Environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in React Native
- The Grid API key is required for authentication and transactions
- Environment: `production` or `development`


---

## 📱 Key Features

### ✅ Implemented Features

- **Email + OTP Authentication**: Secure login and registration with Grid SDK
- **Smart Accounts**: Grid-powered smart accounts on Solana mainnet
- **Send USDC**: Transfer USDC
- **Real-time Balance**: Live balance updates for SOL and USDC tokens
- **Transaction History**: Complete transaction history with real-time updates
- **Biometric Authentication**: Face ID / Touch ID support for quick login
- **Add Funds**: Integration for adding funds to wallet

### 🚧 In Development

- **Privacy Wallet**: Privacy features are currently under development and not yet functional. Privacy-related screens and components are placeholders for future implementation.

---

## 🛠️ Tech Stack

- **React Native** with **Expo** ~54.0
- **TypeScript** 5.9
- **Grid SDK** (@sqds/grid) - Smart accounts
- **Expo SecureStore** - Encrypted credential storage
- **AsyncStorage** - Local caching
- **Expo Local Authentication** - Biometric authentication

---

## 📦 Key Dependencies

```json
{
  "@sqds/grid": "^0.1.0",
  "@solana/web3.js": "^1.95.8",
  "expo": "~54.0.22",
  "expo-local-authentication": "~15.0.2",
  "expo-secure-store": "~14.0.0",
  "react-native": "0.81.4",
  "typescript": "^5.9.3"
}
```

---

## 🐛 Common Issues

### Metro Bundler Issues

If you encounter module resolution errors:

```bash
# Clear all caches
npx expo start --clear

# Or manually clear
rm -rf node_modules
rm -rf .expo
npm install
```



## 📄 License

Private project - All rights reserved

---

**Last Updated**: 2025-11-04
